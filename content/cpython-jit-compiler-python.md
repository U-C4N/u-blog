---
title: "CPython JIT Compiler: Python's Experimental JIT Explained"
slug: "cpython-jit-compiler-python"
meta_title: "CPython JIT Compiler: Python's Experimental JIT Explained"
meta_description: "CPython 3.14 ships an experimental JIT using copy-and-patch compilation. How it works, real benchmarks, and what it means for Python performance in 2026."
tags: ["python", "performance", "cpython-internals", "compiler"]
language_code: "en"
published: true
date: "2026-02-14"
author: "Umutcan Edizaslan"
keyword: "cpython jit compiler"
---

I spent a decade telling people that Python's speed doesn't matter. "Developer productivity," I'd say, waving my hand like a Jedi. "C extensions. NumPy. Just drop into Rust for the hot path." And I believed it -- until I watched a tight numerical loop in CPython 3.12 run 47x slower than the equivalent C, and had to explain to a product manager why our data pipeline needed six r5.xlarge instances. The **cpython jit compiler** landing in Python 3.13 and 3.14 is the first serious attempt to close that gap from inside CPython itself, and it's worth understanding what's actually happening under the hood.

This isn't a press release. The JIT doesn't make Python fast yet. But the architecture is genuinely clever, the roadmap is credible, and the implications for the next three years of Python performance are bigger than most people realize.

## Python's Performance Problem (and Why a JIT Is the Answer)

Python is slow for a specific, well-understood reason: CPython's main execution loop is an interpreter that dispatches bytecode instructions one at a time. Every `LOAD_FAST`, every `BINARY_ADD`, every `CALL_FUNCTION` goes through the same giant switch statement, and the CPU's branch predictor has a terrible time with it. The indirect dispatch overhead alone accounts for a shocking percentage of total execution time in tight loops.

Since Python 3.11, the **Faster CPython** team (funded by Microsoft, led by Mark Shannon and Guido van Rossum) has been chipping away at this. Python 3.11 introduced the **specializing adaptive interpreter** -- a system that profiles bytecodes at runtime and rewrites them with type-specialized versions. If `BINARY_ADD` keeps seeing two integers, it gets replaced with `BINARY_ADD_INT`, which skips all the type-checking overhead.

This was a big deal. Python 3.11 was roughly 25% faster than 3.10 on average. Python 3.12 added more specializations and introduced a micro-op (uop) intermediate representation. Python 3.13 brought the actual JIT. And now, Python 3.14 ships with the JIT built into official Windows and macOS binaries -- off by default, but one environment variable away:

```bash
# Enable the experimental JIT in Python 3.14
export PYTHON_JIT=1
python3.14 my_script.py
```

The question is: why a JIT at all? Why not just keep making the interpreter smarter?

The answer is that interpreted dispatch has a performance ceiling. No matter how specialized your bytecodes are, you're still bouncing through an interpreter loop, fetching the next instruction, decoding it, and jumping to its handler. A JIT compiler removes that overhead entirely by generating native machine code that the CPU executes directly. No dispatch. No decoding. Just straight-line instructions with real hardware branch prediction.

## Copy-and-Patch: The Technique Behind CPython's JIT

Here's where it gets interesting. When most people hear "JIT compiler," they think of something like the JVM's HotSpot or V8's TurboFan -- massive, sophisticated compilers that do register allocation, inlining, loop unrolling, escape analysis, and a hundred other optimizations at runtime. Building one of those from scratch for CPython would take years and require a permanent team of compiler engineers.

Brandt Bucher, the CPython core developer who built the JIT, took a completely different approach. He implemented a **copy-and-patch** JIT, based on a technique described in a 2021 academic paper by Harisanker Krishna Swamy and Xu Si from the University of Toronto. The idea is deceptively simple.

At **build time** (when you compile CPython itself), each micro-op instruction is compiled by LLVM/Clang into a machine code template called a **stencil**. These stencils are complete machine code sequences with "holes" where runtime values need to be filled in -- think of them as mad libs for assembly code.

At **runtime**, when the JIT decides to compile a trace of micro-ops into machine code, it doesn't invoke a compiler at all. It just:

1. Copies the pre-compiled stencil for each micro-op into an executable memory buffer
2. Patches the holes with actual runtime values (operand indices, memory addresses, cached pointers)
3. Chains the stencils together into a continuous block of native code

That's it. No optimization passes. No register allocation. No IR transformations. Just copy, patch, execute.

Here's what a stencil definition looks like internally. Each hole records an offset into the machine code and what runtime value should be patched in:

```c
// Auto-generated stencil for LOAD_CONST micro-op (x86-64)
static const unsigned char LOAD_CONST_stencil[] = {
    0x48, 0xb8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // movabs rax, <OPERAND>
    0x48, 0x89, 0x45, 0x00,                                       // mov [rbp+offset], rax
    // ... more instructions ...
};

static const Hole LOAD_CONST_holes[] = {
    {0x2, HoleKind_X86_64_RELOC_UNSIGNED, HoleValue_OPARG, NULL, 0x0},
    {0x12, HoleKind_X86_64_RELOC_UNSIGNED, HoleValue_CONTINUE, NULL, 0x0},
};
```

The beauty of this design is maintainability. The JIT backend is approximately 500 lines of runtime C code and 900 lines of build-time Python. When someone changes a bytecode implementation, the stencils are regenerated automatically. There's no second compiler to keep in sync.

The trade-off is obvious: you get none of the cross-instruction optimizations that a "real" compiler would give you. Each micro-op is compiled in isolation. There's no constant folding across operations, no dead code elimination, no register allocation across instruction boundaries. The generated code is correct and avoids interpreter dispatch overhead, but it's not particularly tight.

## What the JIT Actually Compiles

The JIT doesn't compile your Python source code directly. It doesn't even compile Python bytecode directly. It operates on **tier 2 micro-ops** -- a lower-level representation that CPython's optimizer produces from the bytecodes.

Here's the full pipeline:

```
Python Source
    |
    v
Bytecode (LOAD_FAST, BINARY_ADD, etc.)         <-- Tier 1
    |
    v
Specializing Adaptive Interpreter               <-- Rewrites hot bytecodes
    |
    v
Micro-ops (uops) Trace                          <-- Tier 2
    |
    v
Trace Optimizer (guard elimination, etc.)
    |
    v
Copy-and-Patch JIT                              <-- Native machine code
    |
    v
CPU Execution
```

The transition from Tier 1 to Tier 2 happens when CPython detects a "hot" code path -- typically a loop that's been executed enough times. The runtime decomposes the bytecode sequence into micro-ops using a domain-specific table lookup. A single bytecode like `BINARY_ADD` might decompose into several uops: check the type of the left operand, check the type of the right operand, perform the integer addition, push the result.

The **trace optimizer** then runs an abstract interpretation pass over the uop trace, performing type and constant propagation. This is where guards get eliminated -- if the optimizer can prove that a variable is always an integer at a particular point, it removes the type-checking guard. This optimization pass is what makes the JIT's output better than just "stencils glued together."

The JIT then takes the optimized trace and emits native code via copy-and-patch. The resulting machine code executes directly on the CPU, and if any guard fails (because, say, a variable that was always an integer suddenly becomes a float), execution deoptimizes back to the interpreter.

This architecture means the JIT only compiles the hottest inner loops and straight-line traces. It doesn't attempt whole-function compilation. It doesn't inline across function boundaries (yet). It's a **tracing JIT**, not a method JIT, and the traces are relatively short.

## Benchmarks: Where the JIT Helps (and Where It Doesn't)

Let me be honest about the numbers, because the media coverage has been confusing. Here's the reality as of early 2026.

**Python 3.14 JIT performance (vs. 3.14 without JIT):**

| Benchmark | Without JIT | With JIT | Change |
|-----------|-------------|----------|--------|
| Richards | 44.5ms | 37.8ms | ~15% faster |
| Nbody | 91.8ms | 104ms | ~13% slower |
| Spectral Norm | 90.6ms | 96.0ms | ~6% slower |
| Fibonacci | 6.59s | 6.59s | No change |
| Bubble Sort (Linux) | 2.18s | 2.03s | ~7% faster |

The geometric mean across pyperformance? Roughly flat. Some benchmarks improve, some regress, most are within noise. Ken Jin, one of the core JIT contributors, wrote candidly in his two-year reflection: "the JIT ranges from slower than the interpreter to roughly equivalent, depending on compiler version."

Here's the thing that tripped up early reporting: **Python 3.14 is genuinely faster than 3.13**, but most of those gains come from the specializing interpreter improvements, not the JIT. The Fibonacci benchmark went from 8.26s in 3.13 to 6.59s in 3.14 -- a 20% improvement -- and the JIT contributed exactly zero to that.

**Python 3.15 tells a much better story.** The development branch shows 4-5% geometric mean improvement on x86-64 Linux, and 7-8% on AArch64 macOS. Individual benchmarks swing wildly: Richards sees over 100% speedup, while some benchmarks still show 15-20% regression. The range across the full benchmark suite is roughly -20% to +100%.

What changed? Three things: better trace recording that handles generators and object creation, a basic register allocator that avoids unnecessary stack spills, and reference count elimination that skips refcount operations for variables guaranteed to have external references. That last one is subtle but powerful -- CPython's reference counting is one of its biggest performance drags, and being able to skip it for JIT-compiled code is a significant win.

## JIT vs PyPy vs Cython: The Performance Landscape

So where does CPython's JIT sit in the broader Python performance ecosystem?

**PyPy** is still the speed king for pure-Python compute workloads. PyPy's tracing JIT has had over 15 years of optimization, and it regularly delivers 2-10x speedups over CPython on long-running numerical code. If your bottleneck is a tight Python loop doing arithmetic, PyPy will crush CPython's JIT for the foreseeable future.

But PyPy has real-world problems that limit its adoption. C extension compatibility is perpetually fragile. NumPy works, but the broader ecosystem of C extensions (database drivers, image processing libraries, ML frameworks) often doesn't. PyPy also still has a GIL-like locking mechanism, so it can't take advantage of the free-threading work happening in CPython. And warmup time matters -- PyPy's JIT needs to observe execution patterns before it kicks in, which hurts short-lived scripts and serverless functions.

**Cython** occupies a different niche entirely. You annotate Python code with static type declarations, and Cython compiles it to C extension modules. The speedups can be dramatic (10-100x for numerical code), but you're writing a different language at that point. Cython is great for libraries but impractical for application code.

**Numba** is another option for numerical Python -- it JIT-compiles decorated functions using LLVM, achieving near-C performance for array operations. But it's limited to a subset of Python and NumPy.

CPython's JIT has a unique advantage that none of these alternatives share: **it's CPython**. Every C extension works. Every library works. Every tool works. There's no compatibility tax, no separate runtime, no language subset. You set an environment variable and your existing code gets faster.

The realistic picture in 2026 is this: if you need maximum throughput on pure-Python numerical code and can tolerate the ecosystem limitations, PyPy is still faster. If you need a specific hot function to be C-speed, use Cython or Numba. But if you want your entire Python application to be somewhat faster with zero code changes and perfect compatibility, CPython's JIT is the only game in town.

## The Road to a Production JIT

The JIT is still officially "experimental" in Python 3.14 and 3.15. According to PEP 744, it becomes non-experimental when it "provides a meaningful performance improvement for at least one popular platform (realistically, on the order of 5%)." With 3.15 showing 4-5% on x86-64 and 7-8% on AArch64, that threshold is being approached.

The core team has laid out a concrete roadmap. For Python 3.15 (October 2026), the targets are a 5% geometric mean improvement with seven specific optimization strategies:

**Trace recording JIT** replaces the current region selector with a dual-dispatch system that maintains separate dispatch tables for the standard interpreter and a tracing interpreter. This lets the JIT handle generators, custom dunder methods, and object initialization -- all previously unhandled.

**Register allocation** caches stack values in CPU registers using a technique from Anton Ertl's 1995 research. Early results show a 0.5% geometric mean improvement overall, with individual benchmarks like nbody seeing 16% gains. The impact is limited by CPython's reference counting semantics, which is why the next optimization matters so much.

**Reference count elimination** leverages work from Meta's free-threading initiative, introducing `LOAD_BORROW` bytecodes that skip reference counting for variables guaranteed to have external references. Microbenchmarks show roughly 6% improvements, and this acts as an enabler for the register allocator.

**Constant promotion**, inspired by PyPy, embeds trace-level constants directly into compiled code, enabling aggressive constant propagation.

For Python 3.16, the target is 10% geometric mean improvement, with more advanced optimizations including thread-safe JIT support using a Ruby-inspired `PatchPoint` mechanism for runtime assumption invalidation.

There's also an interesting interaction with **free-threading** (the no-GIL build). The JIT team is implementing a system where single-threaded code runs at full JIT speed, and thread creation triggers JIT code invalidation that gracefully degrades to safer but slower code paths. This is the right trade-off -- the vast majority of Python code is single-threaded, and penalizing that majority for the threading minority would be a mistake.

The honest assessment: CPython's JIT won't make Python competitive with Go or Rust for raw compute. That's not the goal. The goal is to make Python 20-30% faster over the next few releases with zero effort from developers. For a language where the majority of production workloads are I/O-bound web services, data pipelines, and ML orchestration scripts, that kind of free performance matters more than any 10x benchmark on a microbenchmark.

The copy-and-patch architecture was the right call. It let a small team ship a working JIT in under two years, with a codebase that non-compiler-experts can contribute to. The optimization layers being built on top -- register allocation, reference count elimination, constant promotion -- are the same things a "real" compiler would do, just applied incrementally. Each release makes the generated code a little tighter.

I'm cautiously optimistic. Not because I think Python will become fast in any absolute sense, but because I think the era of "Python is slow and you just have to live with it" is ending. The JIT is the foundation. The specializing interpreter is the current workhorse. And together, they're compressing the gap between "Python developer productivity" and "acceptable production performance" in a way that actually compounds release over release.

Set `PYTHON_JIT=1`. Watch your benchmarks. The numbers are only going to get better from here.
