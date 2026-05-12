<!--
title: LLM Nedir? Sıfırdan Başlayanlar İçin Sözlük
slug: llm-nedir-sifirdan-baslayanlar-icin
language_code: tr
published: true
tags: llm, yapay-zeka, ai, baslangic, turkce, sozluk, token, transformer, prompt
meta_title: LLM Nedir? Sıfırdan Başlayanlar İçin Türkçe Sözlük (2026)
meta_description: LLM, token, parametre, embedding, context window, prompt, RAG ve hangi model ne — yapay zekaya sıfırdan başlayanlar için kapsamlı 2026 Türkçe rehber.
-->

Geçen hafta bir akrabamla telefondaydım. "Bu ChatGPT denen şey ne ya, herkes konuşuyor da" dedi. Ben anlatmaya başladım — token şu, parametre bu, transformer mimarisi falan — yarım dakika sonra "kestim seni, bir Türkçe konuş" dedi. Haklıydı. 2026'da herkes "AI" diyor ama dürüst olalım, çoğu insan kelimelerin altındaki şeyin ne olduğunu bilmiyor. Bu yazı, o akrabama anlatmaya çalıştığım her şeyin temiz hali. Hiçbir önceki bilgi şart değil; sıfırdan başlıyoruz.

Bir sözlük + el rehberi düşün. Sıkıştığın yerde başlığa bakıp atlayabilirsin. Bitirdiğinde bir LLM tartışmasına denk geldiğinde "hadi bakalım" diyecek kadar zemine sahip olacaksın.

## LLM Aslında Ne Demek?

LLM = **Large Language Model**, Türkçesi **Büyük Dil Modeli**. Üç kelimeyi tek tek açayım:

- **Dil**: insan dili. Türkçe, İngilizce, kod, emoji — ne yazıyorsan.
- **Model**: matematiksel bir tahmin makinesi. "Şu giriyor, şu çıkıyor" diye bir kalıp öğrenmiş bir şey.
- **Büyük**: gerçekten büyük. Milyarlarca sayı barındıran.

Daha somut: bir LLM, **bir sonraki token'ı tahmin etmek üzere** eğitilmiş dev bir sinir ağı. "Bugün hava çok..." yazsam, modelin kafasındaki olasılık tablosunda *güzel* %42, *soğuk* %18, *patates* %0.00001 gibi değerler var. En olası gelecekleri seçerek (veya rastgele örnekleyerek) cümle kuruyor. Hepsi bu.

ChatGPT, Claude, Gemini, Grok — hepsi aynı temel fikrin farklı ürünleri.

"Yani tek yaptığı bir sonraki kelimeyi tahmin etmek mi?" — evet, gerçekten. Mucize gibi görünen her şey (kod yazması, fıkra anlatması, matematik yapması) o tahmin probleminin yeterince iyi çözüldüğünde **kendiliğinden** ortaya çıkan davranışlar. Buna *emergent behavior* (beliren davranış) deniyor ve hâlâ tam olarak anlaşılmış değil.

## Token Nedir?

Modelin kafasında "kelime" diye bir şey yok. **Token** var. Token, modelin görebildiği en küçük parça. Bazen tam kelime, bazen parça, bazen tek harf.

İlk önemli sezgi: aynı kelime farklı dillerde farklı sayıda token olur.

- İngilizce `breakfast` → genelde **1 token**
- Türkçe `kahvaltı` → genelde **2 token**: `kah` + `valtı` (veya benzer bir bölünme)
- `çekoslovakyalılaştıramadıklarımızdanmışsınızcasına` → **15+ token**

Bu bir tasarım kusuru değil, istatistiksel bir gerçek. Tokenizer (token'a bölen algoritma) eğitim verisindeki **en sık görülen kalıpları** birleştirerek vocabulary (sözlük) oluşturur. İngilizce internette çok daha bol olduğu için İngilizce kelimeler tek parça halinde yer alıyor. Türkçe gibi **eklemeli (agglutinative)** dillerde her ek modelin gözünde bir çıkıntı, ve agresif şekilde parçalanıyor.

Bu seni nerede etkiler?

- **Para**: API'ler token başına faturalandırır. GPT-5.5: $1.75 / 1M giriş, $14 / 1M çıkış token. Claude Opus 4.7: $5 / $25. Türkçe yazınca **~2 kat fazla token** harcıyorsan, faturan da 2 kat oluyor.
- **Hız**: Daha çok token = daha çok forward pass = daha yavaş cevap.
- **Context window**: 1M'lik pencereye İngilizce'den daha az Türkçe metin sığar.
- **Kalite**: `evlerden` kelimesi `ev + ler + den` diye temiz bölünse model çoğul ve durum bilgisini koruyabilir. Saçma yerden parçalanırsa bilgi kaybediliyor.

Kullanılan başlıca tokenizer algoritmaları:

| Algoritma | Kim kullanıyor |
|---|---|
| **BPE (Byte-Pair Encoding)** | GPT-2/3/4/5, Llama, Mistral, Gemma, Qwen — fiilen standart |
| **WordPiece** | BERT (artık eski) |
| **SentencePiece** | Llama 1/2, Gemma, T5 |
| **tiktoken** | OpenAI'ın hızlı BPE implementasyonu (Rust) |

Vocabulary boyutu: GPT-4 ~100K, GPT-5 ~200K, Llama 3 ~128K. 2026'da ilginç bir gelişme var: **tokenizer'sız modeller**. Meta'nın **Byte Latent Transformer (BLT)** ham byte üzerinde çalışıyor, sabit bir vocab'a ihtiyaç duymuyor. Mayıs 2026'da Fast BLT çıktı, inference bant genişliğini %50+ azaltıyor. Türkçe gibi düşük temsil edilen diller için uzun vadede iyi haber.

Kendi metnine kaç token gittiğini merak ediyorsan, **platform.openai.com/tokenizer**'a yapıştırıp bak. Garip bir oyun.

## Parametre — "Ayar Düğmeleri"

Modelin içinde **parametre** denen şeyler var. Her parametre, ağdaki bir bağlantıya iliştirilmiş **küçük bir sayı** (bir ağırlık). Modeli eğitmek, milyarlarca düğmeyi azar azar çevirip cevapları daha az yanlış hale getirmek demek.

Ayar düğmesi analojisi tam oturuyor: birine "şu radyodaki 7 milyon düğmeyi çevir, doğru istasyon gelsin" demek gibi. Eğitim algoritması (gradient descent) bunu yapan otomat. Trilyonlarca token gösteriyorsun, her yanlış tahminde düğmeleri usulca düzeltiyor. Aylar sonra düğmeler dilin istatistiksel kalıplarını öğrenmiş halde donuyor.

Niye milyarlarca? Çünkü transformer mimarisi katmanlardan oluşuyor ve her katmandaki "nöron"lar diğerleriyle ağırlıklarla bağlı. Kabaca: `parametre ≈ 12 × katman × gizli boyut²`. Sayılar uçuyor.

Mayıs 2026'daki gerçek rakamlar:

- **GPT-4** (2023): ~1.76 trilyon (söylenti, OpenAI doğrulamadı), MoE.
- **GPT-5 / 5.5**: açıklanmadı; tahminler 2-10T arası.
- **Claude 4.7 Opus**: Anthropic asla açıklamıyor. Sızıntılar 1-5T arası.
- **Llama 3.1 405B**: 405 milyar, **dense (MoE değil)**, 15.6T token üzerinde eğitildi.
- **Llama 4 Scout** (Nisan 2025): 109B toplam / **17B aktif**, MoE.
- **Mistral Large 3** (Aralık 2025): 675B toplam / 41B aktif.
- **DeepSeek V4** (Nisan 2026): tahminen 1T civarı.
- **Qwen 3.6**: 27B dense, 35B MoE varyantları, 201 dil destekli.
- **Phi-4** (Microsoft): 14B dense — ufak ama matematik canavarı.
- **Mistral 7B**: 7.3B, dizüstüne sığar.

### Dense vs MoE

İki tasarım var:

**Dense (yoğun)**: her token için **bütün parametreler** çalışır. Llama 3.1 405B böyle.

**Mixture of Experts (MoE)**: model içinde çok sayıda "uzman" alt-ağ var. Her token için bir yönlendirici (router) sadece **birkaçını** seçer. DeepSeek V3 671 milyar parametreye sahip ama her token'da sadece ~37 milyarlık iş yapar. Beginner sezgisi: dev bir kütüphane, her soruda 1-2 uzmana danışıyor. Çalıştırması ucuz, eğitmesi karışık.

### Scaling Laws

**Chinchilla** araştırması (DeepMind, 2022) şu sezgiyi getirdi: parametre kadar **veri** de önemli. Compute-optimal kural: **her parametre için ~20 eğitim token'ı**. Eski dev modeller (GPT-3) verisini yeterince yememişti. Daha küçük ama daha iyi beslenmiş bir model onları geçebilir. Pratik sonuç: 2026'da bir 7B parametre model, 2022'nin 70B'ından sık sık daha iyi performans veriyor.

### Quantization (Niceleme)

Bir 7B modelini eğitirken her parametre 16-bit (2 byte) tutulur — yani ~14 GB. Bunu çalıştırırken **4-bit**'e indirebiliyorsun (Q4_K_M). Aynı 7B model artık ~4 GB, ve **kalite kaybı çok az**. 16 GB RAM'li bir dizüstüde rahat çalışıyor. Yerel LLM ekosisteminin temel taşı bu.

### "Trilyon" Ne Kadar?

İnsan beyninde ~86 milyar nöron, ~100-500 trilyon sinaps var. Sinapslar parametrelere en yakın analog. GPT-4'ün söylenti 1.76T parametresi bile bir beyne göre 50-300 kat az. Üstelik LLM "parametresi", biyolojik sinapsa göre çok daha basit bir nesne. Trilyon parametre çok, ama beyin değil. Sadece çok.

## Embedding — Anlamı Sayıya Çevirmek

Buraya kadar token'lar (kelimeler) ve parametreler (düğmeler) var. Arada bir köprü gerek: model token'ları sadece **tamsayı ID** olarak görür ("cat" → 4842). Ama matematiği vektörlere çalışıyor. Token'ı vektöre çeviren katmana **embedding layer** denir.

Embedding nedir: **anlamı temsil eden bir sayı listesi (vektör)**. Tipik boyutlar 768, 1024, 1536 veya 3072. Her metin yüksek-boyutlu bir uzayda **bir nokta**. Anlamca benzer şeyler birbirine yakın, alakasız şeyler uzak.

Klasik örnek, en iyi sezgi pompası. Word2vec'in (2013) ünlü denklemi:

> **kral − erkek + kadın ≈ kraliçe**

Yani vektör uzayında "cinsiyet" diye bir yön var. "Kral"dan "erkek" yönünü çıkartıp "kadın" yönünü eklediğinde "kraliçe"ye geliyorsun. Aynısı: **Paris − Fransa + İtalya ≈ Roma**. Word2vec/GloVe çağından bu yana modeller daha karmaşıklaştı, ama sezgi hâlâ ayakta.

Modern LLM'lerde ilk katman embedding katmanı. Her token önce ~3072 boyutlu bir vektöre haritalanır, sonra onlarca transformer katmanı bu vektörü bağlam üzerinde dönüştürür. **Embedding katmanı anlam dünyasına geçtiğin kapı.**

Embedding'ler ayrı bir ürün olarak da satılıyor. 2026 liderleri:

- **Google gemini-embedding-001** — 3072 boyut, 100+ dil, MTEB lideri
- **OpenAI text-embedding-3-large** — 3072 boyut
- **Cohere embed-v4** — multimodal (resim + metin aynı uzayda)
- **Qwen3-Embedding-8B** — açık ağırlık, multilingual MTEB #1

İki metnin ne kadar yakın olduğunu **cosine similarity** ile ölçeriz: vektörlerin arasındaki açının kosinüsü. −1 (zıt) ile +1 (aynı yön) arası.

Embedding'ler **RAG**'in temelini oluşturuyor (birazdan göreceğiz) ve **multimodal** çalışıyor. CLIP modeli (OpenAI, 2021) bir köpek fotoğrafıyla "a photo of a dog" metnini **aynı vektör uzayına** yerleştiriyor. Sonuç: bir fotoğraf koleksiyonunda Türkçe cümleyle arama yapabilirsin. "Deniz kenarında baharda piknik" yazıyorsun, kameranın seni bir Mart sabahında çektiği fotoğrafı buluyor. Sihir değil, lineer cebir.

## Context Window — Modelin Kısa Vadeli Hafızası

Bir LLM bir sohbet sırasında **bir şey hatırlamaz**. Her seferinde sıfırdan, sadece o anda görebildiği token'lara bakıyor. Görebildiği toplam token sayısına **context window** (bağlam penceresi) deniyor.

Bu pencereye giren her şey context'i tüketir:

- Sistem mesajın ("Sen yararlı bir asistansın...")
- Sohbet geçmişi
- Yapıştırdığın dosyalar/PDF'ler
- RAG ile enjekte edilen belgeler
- O an üretmekte olduğu cevap

Pencere dolduğunda model eski şeyleri unutuyor veya sıkıştırıyor. Beginner sezgisi: **modelin masası**. Masada olmayan şey, o tur için yok.

Mayıs 2026 rakamları:

| Model | Context Window |
|---|---|
| **Claude Opus 4.7** | 1M token (~750.000 İngilizce kelime ≈ 10-14 roman) |
| **GPT-5.5** | 1M (API), 400K (Codex) |
| **Gemini 3.1 Pro** | 1M-2M |
| **Grok 4.3** | 1M |
| **Llama 4 Scout** | **10M iddia** (ama 256K'da eğitildi; gerçek kalite şüpheli) |
| **DeepSeek V4** | 1M |
| **Phi-4** | 16K |

Önemli nokta: **büyük context her zaman iyi değil**. Çok uzun pencerede modeller "lost in the middle" (ortada kaybolma) sorunu yaşıyor — başı ve sonu hatırlıyor, ortadakini görmüyor gibi davranıyor.

## Attention — Modelin Gerçekte Ne Yaptığı

Bir cümleyi anlamlandırmanın sırrı **attention** (dikkat) mekanizmasında. 2017'de Google'ın "Attention Is All You Need" makalesi her şeyi değiştirdi. O kâğıttan önce dil modelleri sıralı (RNN/LSTM) çalışıyordu — yavaştı ve uzun bağlamı tutamıyordu. Transformer **her token'ın diğer her token'a aynı anda bakmasına** izin verdi.

Sezgi: "Kıyıdaki banka dik" cümlesinde "banka"yı anlamak için modelin "kıyı" ve "dik" kelimelerine **daha çok ağırlık vermesi**, "para" kavramına **az ağırlık vermesi** lazım. Attention bunu sayısal yapıyor — her token diğer her token için bir "ne kadar dikkat edeyim" skoru üretiyor. Bu işlem paralel yapılabildiği için GPU'larda hızla eğitilebiliyor. Modern LLM patlamasının teknik temeli budur.

## Prompt — Ne Yazdığın Önemli

**Prompt** = modele yazdığın metin. Chat arayüzleri prompt'u üç role böler:

- **System prompt** — sürekli geçerli olan talimatlar (kimlik, kurallar, ton): "Sen bir SQL uzmanısın, kısa cevap ver"
- **User message** — sen
- **Assistant message** — modelin cevabı (sonraki turlarda geçmiş olarak geri besleniyor)

Çok basit ama etkili bir hile: cevap istediğin şey karmaşıksa **"adım adım düşün"** veya **"önce muhakemeni göster, sonra son cevabı ver"** ekle. Bu tekniğin adı **chain-of-thought** (düşünce zinciri). Model kendi ara çıktısını karalama kâğıdı olarak kullanıyor ve doğruluk ciddi ölçüde artıyor. 2026'nın "thinking" modelleri (Claude extended thinking, GPT-5.5 Thinking, Gemini 3 Deep Think, DeepSeek R1) bunu otomatik içeride yapıyor.

Kendi tecrübemden pratik kurallar:

- **Spesifik ol**. "Bir hikâye yaz" yerine "noir tonda, 200 kelimelik, İstanbul'da geçen polisiye paragraf yaz".
- **Örnek ver** (few-shot). Tonu yakalamasının en hızlı yolu.
- **Format söyle**. "Markdown tablo halinde", "yalnızca JSON", "her madde tek cümle".
- **Olumsuzlama kötü**. "X yapma" yerine "Y yap" daha iyi sonuç verir.

## Hallucination — Modelin Kafadan Atması

Bir LLM **kendinden emin bir şekilde yanlış şey söyleyebiliyor**. Hayali kitap referansı, var olmayan API fonksiyonu, yanlış tarih, uydurma alıntı. Bu fenomenin adı **hallucination** (halüsinasyon).

Neden oluyor? Çünkü model **bir veritabanı değil**. İçinde "doğru cevaplar tablosu" yok. Yaptığı tek şey eğitim verisindeki kalıplara bakıp **bir sonraki istatistiksel olarak makul token'ı** üretmek. Sorduğun konuda veri yetersizse, model yine de en mantıklı görünen cümleyi kurar — ve o cümle uydurma olabilir.

Daha kötüsü: OpenAI'ın Eylül 2025 makalesi ("Why Language Models Hallucinate") gösterdi ki eğitim süreçleri **emin tahmin etmeyi**, "bilmiyorum" demekten **daha çok ödüllendiriyor**. Test puanı = 0 ile "bilmiyorum" denmez, tahmin = en azından kazanma şansı var. Modeller bu yüzden blöf yapmayı öğreniyor.

**Beginner kuralı**: Bir LLM'in söylediği her tarih, sayı, isim, alıntı veya API çağrısını birinci elden kaynakla doğrulamadan kullanma. Halüsinasyon mimarinin yapısal bir özelliği, bir sonraki versiyonda kaybolacak bir bug değil.

## Pretraining, Fine-tuning, RLHF

LLM yapmak üç aşamalı bir iş:

1. **Pretraining (ön-eğitim)**: trilyonlarca token (internet, kitaplar, kod) üzerinde self-supervised next-token prediction. Aylar süren GPU eğitimi, on milyonlardan yüz milyonlara dolar maliyet. Çıktı: **base model** — dili biliyor ama henüz asistan değil.

2. **Fine-tuning (SFT)**: çok daha küçük, özenle seçilmiş veriyle eğitime devam. Modeli bir alana (tıp, hukuk, müşteri desteği) veya tona uyarlar. Açık ağırlıklı modellerde sen de yapabilirsin.

3. **RLHF / DPO**: insan değerlendirmelerinden öğren. İnsanlara modelin iki cevabı gösterilir, hangisini tercih ettikleri sorulur. Model bu tercihleri yakalayacak şekilde ayarlanır. **Yararlı, zararsız, dürüst** asistan kişiliği bu aşamada şekilleniyor. Anthropic burada **Constitutional AI** denen kendi tekniğini kullanıyor.

## RAG — Modelin Bilmediğini Öğretmek

Modelin eğitim verisinin bir **kesim tarihi** var. ChatGPT'ye "bugünkü hava nasıl?" dediğinde bilmiyor, çünkü kendi başına internete bağlı değil. RAG bu sorunu çözer.

**Retrieval-Augmented Generation** = sorgu zamanında ilgili belgeleri **modelin context'ine enjekte etmek**.

Tipik akış:

1. Belgeleri parçalara böl (chunk)
2. Her parçayı embedding modeliyle vektöre çevir
3. Vektör veritabanına (Pinecone, Qdrant, pgvector) kaydet
4. Kullanıcı soru sorduğunda → sorunun embedding'ini çıkar → cosine similarity ile en yakın 5-10 parçayı çek → bunları LLM'in prompt'una yapıştır → cevap üret

Niye iyi: model artık o özel belgelere referansla cevap veriyor. Halüsinasyon dramatik şekilde düşer, kaynak gösterebilir, yeni veri eklemek için modeli yeniden eğitmek gerekmez.

**RAG vs Fine-tuning**:

- RAG = **bilgiyi değiştirmek** için (yeni haberler, şirket içi belgeler)
- Fine-tuning = **davranışı/üslubu** değiştirmek için (hukuki ton, özel format)
- İkisi rakip değil, beraber kullanılır.

## Training vs Inference — İki Farklı Dünya

- **Training** bir kez olur. Aylar sürer. Sınır modeller için $10M-$1B+. Çıktısı parametre dosyaları.
- **Inference** her sorguda olur. Milisaniyeler. Soru başına kuruşlar.

Sen bir API kullanıcısı olarak hep inference'a para ödüyorsun. Claude 4.7'nin $5 input / $25 output ücreti = inference maliyeti. Eğitimin parasını OpenAI/Anthropic karşıladı.

## Temperature ve Top-p — Yaratıcılık Düğmeleri

Çoğu API'de iki parametre görürsün:

- **Temperature**: 0 → en olası token'ı seç (deterministik). 0.7-1.0 → daha rastgele, yaratıcı. 0 koy, aynı soruya hep aynı cevap. 1 koy, her seferinde farklı.
- **Top-p (nucleus sampling)**: kümülatif olasılığı `p` (genelde 0.9) eden en küçük token kümesinden örnekle.

Yaratıcı yazı için 0.7-0.9. Kod veya gerçek bilgi için 0.0-0.2.

## GPT, Llama, Mistral, Claude, Gemini — Hangisi Ne?

Bu modeller **aynı temel mimaride** (Transformer) ama eğitim verisi, ince-ayar tarzı, mimari detaylar ve ekosistemleri farklı. Mayıs 2026 manzarası:

### Kapalı Kaynak Liderler

**OpenAI — GPT-5.5** (Nisan 2026): Şu an default ChatGPT modeli. GPT-5.3'e göre **%52.5 daha az halüsinasyon** iddiası. Varyantlar: GPT-5.5 Instant (free), GPT-5.5 Thinking (Plus/Pro), GPT-5.5 Pro. En geniş dağıtıma sahip ekosistem.

**Anthropic — Claude Opus 4.7** (16 Nisan 2026): **1M context'i standart fiyatla** verdi (uzun-bağlam ek ücreti yok). Kodlama ve agentic görevlerde lider. "Bilgisayar başına oturt, 4 saatte modülünü yazsın" tarzı işler için tercih. $5/$25 token başına.

**Google — Gemini 3 / 3.1 Pro**: multimodal (metin + resim + ses + video) en güçlü model. **Gemini 3 Deep Think** paralel hipotez incelemesi yapıyor.

**xAI — Grok 4.3** (Nisan 2026): "Her zaman düşünüyor". 1M context, video girişi, ses klonlama. SuperGrok Heavy aboneliği aylık $300.

### Açık Ağırlıklı (İndir ve Çalıştır)

**Meta — Llama 4** (Nisan 2025): Scout (10M context, hafif) + Maverick (128 expert, multimodal). MoE. Hugging Face'ten ücretsiz.

**Mistral — Mistral Large 3** (Aralık 2025): 675B toplam / 41B aktif, 256K context. AB merkezli. Codestral kod modeli ayrı.

**DeepSeek — V4** (Nisan 2026) + **R1**: Çinli takım. R1, Ocak 2025'te **batıyı şoke etti** çünkü pure-RL ile o1-seviyesi reasoning'i çok ucuza üretti. MIT lisanslı.

**Alibaba — Qwen 3.6** (Nisan 2026): **201 dil** desteği — multilingual'da rakipsiz. Türkçe için açık-kaynak tarafında en iyi seçeneklerden biri.

**Microsoft — Phi-4**: 14B dense, matematik/mantık odaklı. Telefonda bile çalışabilen Phi-4-mini var.

### Kapalı vs Açık — Beginner İçin Ne Demek?

- **Kapalı**: API'ye veya web'e bağlanırsın. Token başına ödersin. Ağırlıklar şirkette kalır. **Sıfır kurulum, sınır kalite.** Teknik olmayan kullanıcı için kazanan.
- **Açık ağırlık**: Hugging Face'ten indirirsin. Kendi bilgisayarında çalıştırırsın. **Doların yok, donanım masrafın var.** 7B Q4 model 16 GB'lık dizüstüye sığar. 70B için 24+ GB VRAM'lik GPU veya Apple Silicon Mac unified memory.

### Hangisini Kullanmalıyım?

| Senaryo | Tavsiye |
|---|---|
| Bedava, tarayıcıda hızlı sohbet | ChatGPT free, Claude.ai free, Gemini, Copilot |
| En iyi genel performans | Claude Opus 4.7 (yazı/kod), GPT-5.5 Thinking (genel), Gemini 3 Pro (multimodal) |
| Dizüstünde yerelde çalıştır | Qwen 3.6 7B, Llama 3.3-8B, Phi-4-mini (Ollama ile) |
| Türkçe özelinde | Closed: Gemini 3 Pro, GPT-5.5. Açık: Qwen 3.6 veya Türkçe fine-tune'lar (Trendyol-LLM, WiroAI) |
| Projende API olarak kullan | Claude Sonnet 4.6 (ucuz + güçlü), GPT-5.5-mini, DeepSeek V3.2 (~10× ucuz), Mistral (AB veri) |

## Yerel LLM Ekosistemi

Dizüstüne LLM kurmak istersen şunları duyacaksın:

- **llama.cpp** — Georgi Gerganov'un C/C++ inference motoru. CPU, CUDA, Metal, Vulkan, hepsinde çalışır. Tüm yerel ekosistemin altyapısı.
- **GGUF** — llama.cpp'nin dosya formatı. Tek dosyada ağırlık + tokenizer + meta. Genelde 4-bit quantize halinde dağıtılır.
- **Ollama** — `ollama run llama3` komutuyla model çalıştırırsın. OpenAI-uyumlu yerel API sunar. Geliştirici için ideal.
- **LM Studio** — GUI'li alternatif. Hugging Face entegre, tıkla-indir. Teknik olmayan kullanıcı için iyi.
- **Jan** — açık kaynak ChatGPT yerine geçen masaüstü uygulaması.

10 dakikalık deneme: Ollama indir, `ollama run qwen2.5:7b` yaz, Türkçe konuş. Dizüstünde yerel, ücretsiz, internetsiz.

## Sırada Ne Öğrenmeli?

Bu sözlük temel. İlerlemek istiyorsan şu sırayı öneririm:

1. **3Blue1Brown'ın "Neural Networks" oynatma listesi** (YouTube) — görsel ve hafif matematikle transformer'ı anlatıyor. Türkçe altyazı var.
2. **Andrej Karpathy'nin "Let's build GPT" videosu** — sıfırdan minik bir GPT kodluyor. Python bilmek yeterli.
3. **Bir RAG sistemi kur** — LangChain veya LlamaIndex ile 50 PDF üzerinde soru-cevap robotu. En öğretici proje.
4. **Bir modeli fine-tune et** — Hugging Face + Unsloth ile Llama 3'ü kendi Türkçe verinle ince ayar yap.

## Kapanış

Buraya kadar geldiysen tebrikler — artık bir LLM tartışmasında **tam olarak hangi kavramın eksik tartışıldığını** görebilirsin. "AI hayal görüyor" denildiğinde halüsinasyonun **mimari** bir özellik olduğunu, bir patch'le geçmeyeceğini söyleyebilirsin. "Llama 4'ün 10M context'i var" dediklerinde **ne ölçüde gerçek** olduğunu sorgulayabilirsin. "Bedava yerel model" denince Ollama'yı açıp 5 dakikada deneyebilirsin.

Yine de bilmediğin bir şeye denk gelirsen şunu hatırla: çoğu LLM kavramı, üstündeki jargon kabuğunu soyduğunda **istatistik + lineer cebir + biraz mühendislik**. Mistik bir şey yok. Sadece çok büyük bir tahmin makinesi, çok iyi tahmin etmesi öğretilmiş.

Sonraki yazıda RAG'i sıfırdan elimle örerek anlatacağım — bu makinenin bilgisini güncel tutmanın diğer açısı. Şimdilik elveda, ve token'ların seninle olsun.
