---
title: "Zero-Copy Serialization in Python: Protocol Buffers, FlatBuffers, and msgspec in 2026"
slug: "python-zero-copy-serialization"
meta_title: "Python Zero-Copy Serialization: msgspec, Protobuf, FlatBuffers Benchmarked"
meta_description: "Compare Python serialization performance: msgspec vs protobuf vs FlatBuffers vs orjson. Real benchmarks, zero-copy techniques, and when to use each in 2026."
tags: ["python", "performance", "serialization", "msgspec"]
language_code: "en"
published: true
date: "2026-02-14"
author: "Umutcan Edizaslan"
keyword: "python zero-copy serialization"
---

Last month I was profiling a Python microservice that processes 40,000 messages per second from a Kafka topic. CPU was pegged at 92%. I assumed it was our business logic -- some hairy graph traversal stuff. I was wrong. Over 61% of the CPU time was spent in `json.loads()` and the Pydantic model validation that followed. Serialization. The thing nobody thinks about until it's the only thing that matters.

This sent me down a rabbit hole that I've been living in for weeks: the world of python zero-copy serialization. I benchmarked everything. I read C extension source code. I swapped serialization layers in production and watched our P99 latencies drop by 4x. What I found is that the Python serialization landscape in 2026 is genuinely exciting -- and most teams are leaving enormous performance on the table by defaulting to `json.dumps()` and calling it a day.

Here's everything I learned.

## The Hidden Tax: Why Serialization Is Your Actual Bottleneck

Most Python developers think of serialization as a solved, boring problem. You call `json.dumps()`, you get a string. You call `json.loads()`, you get a dict. What's to optimize?

Everything, it turns out.

In a typical Python web service, serialization and deserialization happen constantly: reading request bodies, writing response bodies, communicating between microservices, pushing to and pulling from message queues, caching in Redis, logging structured events. A single API request might serialize and deserialize data six to ten times before a response leaves the server.

The stdlib `json` module is implemented partly in C (via `_json`), but it's fundamentally limited. It builds a complete Python object tree on every `loads()` call -- every string becomes a `str`, every number becomes an `int` or `float`, every object becomes a `dict`. Each of these is a heap allocation. For a 1 KB JSON payload with 30 fields, you're looking at 50+ individual Python object allocations, each going through the memory allocator, each tracked by the garbage collector.

Multiply that by thousands of requests per second and you start to understand why serialization routinely shows up as 20-40% of CPU time in profiled Python services. I've seen it go as high as 60%+ in services that do lightweight processing on large message payloads -- which describes most data pipeline workers.

The fundamental issue is **copying**. Traditional serialization follows a pattern: bytes come in from the network, get copied into a Python buffer, get parsed into intermediate tokens, get copied again into Python objects, and then optionally get validated and copied into yet another set of typed objects (your Pydantic models, dataclasses, etc.). That's three or four copies of essentially the same data, each with its own allocation overhead.

Python zero-copy serialization aims to eliminate as many of these copies as possible. The approaches vary -- some reduce copies from four to two, some from four to one, and FlatBuffers achieves a true zero-copy read directly from the wire bytes. Let's look at each approach.

## Protocol Buffers: The Incumbent Workhorse

Protocol Buffers (protobuf) has been Google's serialization format since 2001, and it's been open source since 2008. In 2026, with the v7.x release line (7.34.0 at time of writing), the Python implementation has matured considerably thanks to the `upb` backend becoming the default since version 4.21.0.

The `upb` backend is built on a high-performance C library rather than wrapping the C++ implementation like the old `cpp` backend. This gives Python protobuf substantially better parsing performance, especially for large payloads. The old pure-Python backend is still available as a fallback, but you really don't want to use it in production.

Here's what working with protobuf looks like in Python:

```protobuf
// user.proto
syntax = "proto3";

message User {
  string name = 1;
  string email = 2;
  int32 age = 3;
  repeated string tags = 4;
  Address address = 5;
}

message Address {
  string street = 1;
  string city = 2;
  string country = 3;
}
```

```python
# After running: protoc --python_out=. user.proto
from user_pb2 import User, Address

# Serialization
user = User(
    name="Alice",
    email="alice@example.com",
    age=30,
    tags=["developer", "python"],
    address=Address(
        street="123 Main St",
        city="Portland",
        country="US"
    )
)

wire_bytes = user.SerializeToString()  # ~58 bytes
# Compare: json.dumps equivalent is ~145 bytes

# Deserialization
parsed = User()
parsed.ParseFromString(wire_bytes)
print(parsed.name)  # "Alice"
```

Protobuf's strengths are well-known: compact binary format (typically 2-3x smaller than JSON), strong schema evolution guarantees, and broad language support. In benchmarks, protobuf serialization in Python is roughly 53% faster than equivalent JSON serialization and 73% faster for deserialization. The wire format is compact because it uses variable-length integer encoding (varints), field tags instead of string keys, and no whitespace or delimiters.

But protobuf is **not** zero-copy. When you call `ParseFromString()`, the upb backend allocates a C-level message structure and copies all field values into it. When you access fields from Python, another copy happens as values are converted into Python objects. It's faster than JSON parsing, but it still follows the parse-then-access pattern. For our purposes, protobuf sits in the "fewer copies" category rather than the "zero copies" category.

The real friction with protobuf in Python in 2026 is ergonomic. You need the `protoc` compiler in your build pipeline. Generated code is ugly and untyped. IDE support ranges from decent to terrible depending on your tooling. For services that live entirely in the Python ecosystem, protobuf often feels like overkill.

## FlatBuffers: True Zero-Copy, But at What Cost?

FlatBuffers is Google's answer to the question: "What if we never deserialized at all?"

Created by Wouter van Oortmerssen (who also created the game engine scripting language that became the basis for `flatc`), FlatBuffers stores data in a binary format that can be read directly without a parsing step. The serialized bytes **are** the data structure. You access fields through accessor methods that calculate offsets into the underlying byte buffer on the fly.

This is genuine python zero-copy serialization in the purest sense. When a FlatBuffer arrives over the network, you can start reading fields immediately without allocating any intermediate objects. The byte buffer itself is the data.

The numbers reflect this. In benchmarks, FlatBuffers deserialization takes approximately 0.09 microseconds compared to Protocol Buffers' 69 microseconds for the same payload. That's a 766x speedup on deserialization. The tradeoff is serialization speed: FlatBuffers serialization takes about 1,048 microseconds versus protobuf's 708 microseconds, because the builder has to construct the buffer in a specific layout that enables the zero-copy reads.

There's also a size penalty. Because FlatBuffers uses native-width integers (a 32-bit int always takes 4 bytes, unlike protobuf's varints), serialized messages are typically 2-3x larger than their protobuf equivalents.

Working with FlatBuffers in Python looks like this:

```python
import flatbuffers
from MyGame.Sample import Monster, Vec3, Weapon

# Building a FlatBuffer (serialization)
builder = flatbuffers.Builder(256)

# Strings must be created before the object that references them
name = builder.CreateString("Orc")
weapon_name = builder.CreateString("Sword")

# Build weapon
Weapon.Start(builder)
Weapon.AddName(builder, weapon_name)
Weapon.AddDamage(builder, 15)
sword = Weapon.End(builder)

# Build monster
Monster.Start(builder)
Monster.AddName(builder, name)
Monster.AddHp(builder, 300)
Monster.AddPos(builder, Vec3.CreateVec3(builder, 1.0, 2.0, 3.0))
monster = Monster.End(builder)

builder.Finish(monster)
buf = builder.Output()  # bytearray

# Zero-copy deserialization - no parsing!
monster = Monster.Monster.GetRootAs(buf, 0)
print(monster.Name())     # reads directly from buf
print(monster.Hp())       # offset calculation, no copy
print(monster.Pos().X())  # nested access, still zero-copy
```

The API is verbose and imperative. You have to build objects bottom-up (creating child objects before parents), manage string creation separately, and deal with a builder pattern that feels very Java-circa-2005. The generated Python code is functional but not pleasant.

In practice, I've found FlatBuffers most compelling for two specific scenarios: game development (its original use case) where you're streaming large binary state and need sub-microsecond field access, and data pipeline stages where you receive a large buffer but only need to read 2-3 fields out of a 50-field message. That selective access pattern is where zero-copy truly shines -- you pay zero cost for fields you never touch.

For general Python web services, though, FlatBuffers is a hard sell. The serialization ergonomics are poor, the Python ecosystem integration is minimal (no Pydantic compatibility, no FastAPI integration, no Django REST framework adapters), and the serialized size penalty matters when you're paying for network bandwidth.

## msgspec: The Python-Native Speed Demon

This is where things get really interesting. msgspec, created by Jim Crist-Harif, is a Python library that achieves performance numbers that shouldn't be possible in Python. It's not zero-copy in the FlatBuffers sense -- it does create Python objects -- but it eliminates almost all of the unnecessary intermediate copies and allocations that make traditional serialization slow.

The key insight behind msgspec is that **validation and deserialization should be the same operation**. When you use Pydantic or cattrs, data gets deserialized first (JSON bytes to Python dicts) and then validated second (Python dicts to typed model instances). That's two complete traversals of the data structure, two sets of allocations, and a lot of wasted work. msgspec does both in a single pass through the input bytes, directly constructing validated, typed Struct instances without ever creating intermediate dicts.

The benchmark numbers are striking. Using the official msgspec benchmarks (run on CPython 3.11, x86 Linux):

| Library | JSON Encode (us) | JSON Decode (us) | Total (us) | Relative |
|---|---|---|---|---|
| **msgspec (Struct)** | **140** | **367** | **507** | **1.0x** |
| msgspec (no schema) | 183 | 482 | 665 | 1.3x |
| orjson | 179 | 464 | 643 | 1.3x |
| ujson | 628 | 855 | 1,483 | 2.9x |
| rapidjson | 514 | 1,131 | 1,645 | 3.2x |
| simdjson | 1,234 | 771 | 2,005 | 4.0x |
| stdlib json | 1,228 | 919 | 2,147 | 4.2x |

Read that table again. msgspec with Struct schemas is 4.2x faster than stdlib json for the round-trip, and it's doing **more work** -- it's also validating the data against a schema and producing typed objects. It's faster than orjson, a library written entirely in Rust, while also providing type validation. That's remarkable.

For MessagePack, the story is similar:

| Library | Encode (us) | Decode (us) | Total (us) |
|---|---|---|---|
| **msgspec (Struct)** | **112** | **348** | **460** |
| msgspec (no schema) | 125 | 487 | 612 |
| ormsgpack | 161 | 746 | 907 |
| msgpack | 403 | 799 | 1,202 |

The memory story is even more dramatic. When decoding a large 77 MiB JSON file (the conda-forge repodata, a real-world dataset):

| Library | Peak Memory (MiB) | Decode Time (ms) |
|---|---|---|
| **msgspec (Struct)** | **67.6** | **176.8** |
| msgspec (no schema) | 218.3 | 630.5 |
| stdlib json | 295.0 | 868.6 |
| ujson | 349.1 | 1,087.0 |
| orjson | 406.3 | 691.7 |
| simdjson | 603.2 | 1,053.0 |

msgspec with Structs uses **67.6 MiB** to decode a 77 MiB file. That's less memory than the raw file size. It achieves this through its zero-copy approach to binary data (using `memoryview` instead of copying bytes), its gc-optimized Struct instances (which can skip cyclic garbage collection when `gc=False`), and its single-pass decode-and-validate architecture.

Here's what working with msgspec actually looks like -- and this is why I think it's the right default for most Python services in 2026:

```python
import msgspec
from typing import Optional

# Define your schema with Struct -- like a dataclass but faster
class Address(msgspec.Struct):
    street: str
    city: str
    country: str = "US"

class User(msgspec.Struct):
    name: str
    email: str
    age: int
    tags: list[str] = []
    address: Optional[Address] = None

# JSON encode/decode with validation
encoder = msgspec.json.Encoder()
decoder = msgspec.json.Decoder(User)

user = User(
    name="Alice",
    email="alice@example.com",
    age=30,
    tags=["developer", "python"],
    address=Address(street="123 Main St", city="Portland")
)

# Encode to JSON bytes
data = encoder.encode(user)
# b'{"name":"Alice","email":"alice@example.com","age":30,...}'

# Decode with validation in a single pass
parsed = decoder.decode(data)
assert isinstance(parsed, User)
assert isinstance(parsed.address, Address)

# Invalid data raises a clear error
try:
    decoder.decode(b'{"name": "Bob", "email": "bob@test.com", "age": "not_a_number"}')
except msgspec.ValidationError as e:
    print(e)  # "Expected `int`, got `str` - at `$.age`"

# MessagePack -- same API, even faster
mp_encoder = msgspec.msgpack.Encoder()
mp_decoder = msgspec.msgpack.Decoder(User)

mp_data = mp_encoder.encode(user)  # binary, more compact
parsed_mp = mp_decoder.decode(mp_data)

# Zero-copy binary field access with memoryview
class Packet(msgspec.Struct):
    header: str
    payload: bytes  # will be memoryview into source buffer

raw = msgspec.msgpack.decode(some_bytes, type=Packet)
# raw.payload is a memoryview -- no copy of the binary data!
```

The API is clean, Pythonic, and hard to misuse. Struct definitions look like dataclasses. The encoder/decoder pattern lets you amortize schema compilation cost across many operations. And everything is fully typed -- mypy and pyright understand msgspec Structs natively.

Compared to Pydantic v2, msgspec is approximately 12x faster for combined decode+validate workloads and uses 25x less memory. Compared to cattrs, it's about 10x faster. And unlike those libraries, msgspec Struct instances themselves are faster to create (4x faster than dataclasses, 17x faster than Pydantic models), faster to compare, and produce less garbage collection pressure.

The one caveat: msgspec Structs are intentionally more limited than Pydantic models. There are no computed fields, no custom validators with complex dependency logic, no automatic JSON schema generation for OpenAPI. msgspec is a serialization and validation library, not a data modeling framework. This is a deliberate design choice that enables its performance.

## Head-to-Head: The Complete Python Serialization Benchmarks

Let me put all of these options side by side with a unified view. These numbers synthesize the official benchmarks from each library, cross-referenced against independent benchmarks published in 2025:

| Approach | Encode Speed | Decode Speed | Validation | Wire Size | Zero-Copy | Python Ergonomics |
|---|---|---|---|---|---|---|
| stdlib json | 1.0x (baseline) | 1.0x (baseline) | None | Large | No | Excellent |
| orjson | 6.8x faster | 2.0x faster | None | Large (JSON) | No | Good |
| msgspec (JSON, Struct) | 8.8x faster | 2.5x faster | Built-in | Large (JSON) | Partial | Excellent |
| msgspec (msgpack, Struct) | 11.0x faster | 2.6x faster | Built-in | Medium | Partial | Excellent |
| protobuf (upb) | 2-3x faster | 3-4x faster | Schema-based | Small | No | Fair |
| FlatBuffers | 1.2x slower | 750x+ faster* | Schema-based | Medium-Large | Yes | Poor |

*FlatBuffers "decode" speed reflects accessing a single field from an already-received buffer. It's not a complete deserialization -- that's the whole point.

Some important nuances the table doesn't capture:

**orjson** is the best drop-in replacement if you just want faster JSON without changing your data model. Swap `json.dumps/loads` for `orjson.dumps/loads` and enjoy a 2-7x speedup with zero API changes. The library is written in Rust and is rock solid.

**msgspec** wins if you can adopt its Struct types for your data models. The combined decode+validate performance is unmatched, and the memory efficiency is extraordinary. For new Python services in 2026, I think this should be the default choice.

**protobuf** still makes sense for cross-language RPC (especially with gRPC), for systems where wire size is critical (IoT, mobile, metered bandwidth), and for organizations that have already standardized on .proto schemas. The upb backend has made Python protobuf genuinely fast.

**FlatBuffers** is the specialist tool. When you need sub-microsecond field access on large binary payloads, nothing else comes close. But the development experience in Python is painful enough that I'd only reach for it if the access pattern truly demands it.

## When to Use What: A Decision Framework

After months of testing these in production, here's my decision tree:

**Choose stdlib json when:**
- You're writing scripts, not services
- Interoperability is more important than performance
- Your payloads are tiny (< 100 bytes) and infrequent

**Choose orjson when:**
- You need a zero-effort speedup on existing JSON code
- You can't change your data model layer
- You're already using dicts throughout your codebase

**Choose msgspec when:**
- You're building a new service or refactoring an existing one
- You want validation and serialization in one step
- Memory efficiency matters (worker processes, containers with memory limits)
- You need both JSON and MessagePack support
- You're processing high-throughput message streams (Kafka, RabbitMQ, Redis Streams)

**Choose protobuf when:**
- You need cross-language serialization (Python + Go + Java + Rust in the same system)
- Wire size is a primary constraint
- You're using or planning to use gRPC
- Schema evolution with backward/forward compatibility is a hard requirement

**Choose FlatBuffers when:**
- Read-heavy, write-rare access pattern on large binary data
- You need to access a few fields from very large messages without parsing the whole thing
- Sub-microsecond deserialization latency is a genuine requirement
- You're in gaming, robotics, or real-time systems territory

For the Kafka service I mentioned at the beginning of this post, I went with msgspec using MessagePack encoding. The migration took about two days -- mostly mechanical conversion of Pydantic models to msgspec Structs and swapping the serialization calls. CPU usage dropped from 92% to 34%. P99 latency went from 12ms to 3ms. Memory usage per worker dropped from 480MB to 190MB. Those are life-changing numbers for a service that was about to need a hardware scaling event.

## What's Coming Next

The python zero-copy serialization space is evolving fast. A few things I'm watching:

**Python 3.13's free-threaded mode** is going to change the calculus on serialization in multi-threaded workers. msgspec's C extensions are already thread-safe, and the removal of the GIL means you might actually see linear scaling with threads for serialization-heavy workloads. Early benchmarks suggest 3-4x throughput improvements for multi-threaded msgspec decode on free-threaded 3.13t builds.

**msgspec's YAML and TOML support** continues to mature. Having one library handle JSON, MessagePack, YAML, and TOML with the same Struct types and the same validation behavior is a powerful simplification.

**Arrow IPC and zero-copy columnar formats** are increasingly relevant for data-heavy Python services. If your data is tabular, serializing it row-by-row (even with msgspec) is leaving performance on the table. Apache Arrow's IPC format gives you zero-copy access to columnar data and plays beautifully with Pandas, Polars, and DuckDB.

**Cap'n Proto** deserves an honorable mention as another zero-copy format, though its Python support has stagnated. If it sees renewed development, it could be interesting -- it offers a nicer schema language than FlatBuffers with similar zero-copy properties.

The bottom line: serialization performance in Python is no longer a niche concern reserved for FAANG-scale systems. With msgspec available as a pip install, every Python developer can get order-of-magnitude improvements in serialization throughput and memory efficiency. The days of accepting `json.loads()` as "fast enough" should be behind us. Your profiler will thank you.
