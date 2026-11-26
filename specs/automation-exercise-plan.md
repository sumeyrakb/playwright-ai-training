# Automation Exercise — Products / Search / Filtre / Cart Test Planı

## Kapsam ve Ortam

- **Uygulama:** https://automationexercise.com
- **Odak:** Products listesi, ürün arama, kategori/marka filtreleri, sepete ekleme ve sepetten çıkarma.
- **Yöntem:** Playwright MCP ile manuel keşif; senaryolar gerçek gözlemlerden türetilmiştir.
- **Önemli not:** Bu doküman yalnızca plan ve gözlem kaydıdır; **test kodu henüz yazılmadı**.
- **Beklenen sonuç** = ürünün doğru davranması gerektiği kabul edilen kriter.
- **Gözlenen davranış** = keşif sırasında uygulamada fiilen görülen sonuç. İki kolon ayrı tutulmuştur; "Doğrulanmadı" işaretli satırlar henüz çalıştırılmamış senaryolardır.

## Keşif Sırasında Elde Edilen Genel Bilgiler

### Sayfa yapısı

- `/products` → başlık `Automation Exercise - All Products`, içerik başlığı `All Products`, **34** ürün kartı (`.productinfo`).
- Arama alanı: `#search_product` (`placeholder="Search Product"`), gönder butonu `#submit_search`. Arama GET parametresiyle çalışır: `/products?search=...`.
- Arama sonrası içerik başlığı `Searched Products`; sonuç yokken kart sayısı **0**, ayrıca "sonuç bulunamadı" mesajı **yok**.
- Ürün kartı: `img`, fiyat `h2` (örn. `Rs. 500`), ad `p`, detay linki `/product_details/{id}`, sepet linki `a.add-to-cart[data-product-id="{id}"]`.
- Sepet ekleme linki (`a.add-to-cart`) DOM'da her kartta mevcut; `opacity: 1` ve `getBoundingClientRect()` dolu, yani hover olmadan da tıklanabilir. Hover yalnızca görsel odak/kontrast için gibi görünüyor (C-06).
- Kategori/marka başlıklarında bazen fazla boşluk var (örn. `Women -  Dress Products`, ` Brand -  Polo Products`); assertion'larda `trim` + iç boşluk normalizasyonu gerekir.
- Kategori akordiyonları `#Women`, `#Men`, `#Kids`; marka listesi `.brands-name li a` (8 marka).
- Sepet modalı `#cartModal`: `Added!` / `Your product has been added to cart.` + `View Cart` (`/view_cart`) + `Continue Shopping`.
- Sepet sayfası `/view_cart` (sayfa başlığı `Automation Exercise - Checkout`): tablo `#cart_info_table`, satır `#product-{id}`, miktar hücresi `.cart_quantity` (buton **disabled**), silme linki `.cart_quantity_delete[data-product-id]`.
- Boş sepet mesajı: `Cart is empty! Click here to buy products.` (`here` linki `/products`).
- Ürün detay sayfasında miktar alanı `#quantity` (`type=number`, `min="1"`, varsayılan `1`) ve `button.cart` ("Add to cart").

### Kategori / marka URL'leri

| Kök | Alt kategori | URL |
|---|---|---|
| Women | Dress | `/category_products/1` |
| Women | Tops | `/category_products/2` |
| Women | Saree | `/category_products/7` |
| Men | Tshirts | `/category_products/3` |
| Men | Jeans | `/category_products/6` |
| Kids | Dress | `/category_products/4` |
| Kids | Tops & Shirts | `/category_products/5` |

Marka sayıları (sidebar): Polo (6), H&M (5), Madame (5), Mast & Harbour (3), Babyhug (4), Allen Solly Junior (3), Kookie Kids (3), Biba (5). URL örneği: `/brand_products/Polo`.

### Keşif sırasında karşılaşılan çevresel gürültü

- Google reklam "vignette" katmanı bazı tıklamalardan sonra açılıyor; sayfa `aria-hidden="true"` oluyor ve URL `#google_vignette` ekleniyor. Etkileşim öncesi katmanın kapatılması/kontrol edilmesi gerekiyor; aksi halde tıklamalar engellenir.
- Ürün detay sayfasında "Discover more" / "Understanding Men's Skincare Needs" gibi ek içerik katmanları görünebiliyor.
- Konsolda sürekli hatalar var (reklam/favicon kaynaklı); işlevsellik etkilemediği için bilinen gürültü olarak değerlendirilecek.
- Arama ve sepet durumu sunucu oturumunda tutuluyor: sayfalar arası gezinme ve yenileme sonrası sepet korundu.

## Senaryolar

### A. Ürün Arama (Search)

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| A-01 | Pozitif | `/products` sayfasında arama alanına `Tshirt` yaz, ara butonuna bas. | `Searched Products` başlığı görünür; URL `?search=Tshirt`; eşleşen ürünler listelenir. | URL `?search=Tshirt`, başlık `Searched Products`, **6** kart: `Men Tshirt`, `Pure Cotton V-Neck T-Shirt`, `Green Side Placket Detail T-Shirt`, `Premium Polo T-Shirts`, `Pure Cotton Neon Green Tshirt`, `GRAPHIC DESIGN MEN T SHIRT - BLUE`. |
| A-02 | Pozitif | Arama alanına `top` (küçük harf) yaz, ara. | Büyük/küçük harf farkı sonucu etkilememeli; adında `top` geçen ürünler gelmeli. | **14** kart listelendi; `T-Shirt` / `T SHIRT` varyantları da eşleşti. Arama büyük/küçük harfe duyarsız görünüyor. |
| A-03 | Pozitif | Arama sonuçlarından bir ürünün `View Product` linkine bas. | İlgili ürün detay sayfasına gidilir; ad/fiyat bilgileri tutarlıdır. | İlk sonucun linki `/product_details/1` idi; tıklama reklam katmanı nedeniyle önce engellendi, katman kapatılınca `/product_details/1` açıldı; başlık `Blue Top`, sayfa `Automation Exercise - Product Details`. |
| A-04 | Negatif | Var olmayan `zzzznotexist` kelimesini ara. | Ürün listelenmez; kullanıcıya boş sonuç bilgisi verilmesi arzu edilir. | Başlık `Searched Products`, **0** kart; boş sonuç mesajı görünmedi, hata oluşmadı. |
| A-05 | Negatif | `' OR 1=1 --` gibi SQL benzeri girdi ara. | Girdi düz metin olarak ele alınır; tüm ürünler dökülmez; uygulama hata vermez. | **0** kart, başlık `Searched Products`, URL parametresi encoded (`%27%20OR%201=1%20--`); SQL enjeksiyonu görünmedi. |
| A-06 | Negatif | Özel karakter / HTML içeren bir terim ara (örn. `<script>`). | Girdi düz metin olarak işlenir; script çalışmaz; sonuçlar güvenli görüntülenir. | `<script>alert(1)</script>` arandı: URL encoded, **0** kart, başlık `Searched Products`; DOM'da `alert(1)` içeren `<script>` bulunmadı, script çalışmadı. |
| A-07 | Sınır | Arama alanını tamamen boş bırakıp ara butonuna bas. | Filtre uygulanmaz; tüm ürünler listelenir. | URL `?search=`, başlık `All Products`, **34** kart. |
| A-08 | Sınır | Yalnızca boşluk `   ` içeren arama yap. | Boşluklar kırpılır; boş arama gibi davranılır. | URL `?search=`, başlık `All Products`, **34** kart; input görünür değeri boş (`""`). |
| A-09 | Sınır | 300 karakterlik `aaaa...` girdisi ara. | Uzun girdide alan kırpılmaz/kontrol edilmez; uygulama çökmez; makul bir sonuç döner. | Input 300 karakteri korudu (`maxlength` yok); başlık `Searched Products`, **0** kart, hata/çökme yok. |
| A-10 | Sınır | Tek karakterli `a` araması yap. | Eşleşen ürünler listelenir; minimum uzunluk kısıtı yoksa hata çıkmaz. | `?search=a` → başlık `Searched Products`, **18** kart (örn. `Madame Top For Women`, `Fancy Green Top`, `Half Sleeves Top Schiffli Detailing - Pink`); hata yok. |
| A-11 | Sınır | Arama yapıp sayfayı yenile / URL'yi doğrudan aç. | Arama terimi ve sonuçlar URL üzerinden korunur. | `/products?search=top` doğrudan açıldı: input `top`, **14** kart; yenileme sonrası input `top`, **14** kart, başlık `Searched Products` (korundu). |

### B. Kategori ve Marka Filtreleri

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| B-01 | Pozitif | `Women` akordiyonunu aç, `Tops` alt kategorisine bas. | Kategori ürünleri listelenir; başlık ve URL kategoriyi yansıtır. | URL `/category_products/2`, başlık `Women - Tops Products`, sayfa başlığı `Automation Exercise - Tops Products`, **6** kart (`Blue Top`, `Winter Top`, `Summer White Top`, `Madame Top For Women`, `Fancy Green Top`, `Lace Top For Women`). |
| B-02 | Pozitif | Kategori sayfasındaki marka listesinden `Polo`ya bas. | Markaya ait ürünler listelenir; başlık `Brand - Polo Products` olur. | URL `/brand_products/Polo`, başlık `Brand - Polo Products`, **6** kart (`Blue Top`, `Fancy Green Top`, iki T-Shirt, `Soft Stretch Jeans`, `Grunt Blue Slim Fit Jeans`). Sidebar sayısı (6) ile kart sayısı tutarlı. |
| B-03 | Negatif | Kategori seçiliyken marka seç: kategori + marka birlikte filtrelenmeli mi? | İki filtrenin birlikte uygulanması beklenir (ürün kuralına bağlı). | **Kombine filtre yok:** marka seçimi kategori filtresinin yerini aldı; `/brand_products/Polo` sayfasında Tops dışı ürünler (jeans) de listelendi. Mevcut davranış "filtreler birbirini değiştirir" yönünde. |
| B-04 | Negatif | Olmayan bir marka URL'sini aç: `/brand_products/NoSuchBrand`. | Hata sayfası ya da boş sonuç görünür; uygulama çökmez. | Başlık `Brand - NoSuchBrand Products`, sayfa başlığı `Automation Exercise - NoSuchBrand Products`, **0** kart; 404/yönlendirme yok. |
| B-05 | Sınır | Kategori sayfasında arama alanı var mı kontrol et. | Arama her sayfada erişilebilir olmalı (ürün kuralına bağlı). | `/category_products/2` sayfasında `#search_product` **yok**; arama yalnızca `/products` sayfasında. |
| B-06 | Sınır | Bütün kategori ve marka linklerinin geçerli sayfa açtığını kontrol et. | Tüm linkler ilgili ürün listesine götürür; konsolda işlevsel hata olmaz. | 7 kategori ve 8 marka URL'sinin tamamı açıldı: kart sayıları Dress 3, Tops 6, Tshirts 6, Kids Dress 6, Kids Tops & Shirts 7, Jeans 3, Saree 3; markalar Polo 6, H&M 5, Madame 5, Mast & Harbour 3, Babyhug 4, Allen Solly Junior 3, Kookie Kids 3, Biba 5 — sidebar sayılarıyla birebir tutarlı; işlevsel hata yok. Bazı başlıklarda fazla boşluk var (genel bilgilere eklendi). |
| B-07 | Negatif | `Mast & Harbour` gibi `&` içeren marka adına tıklamayı dene. | URL doğru encode edilir; doğru ürünler listelenir. | Link `href="/brand_products/Mast & Harbour"`; doğrudan açılışta başlık `Brand - Mast & Harbour Products`, sayfa başlığı `Automation Exercise - Mast & Harbour Products`, **3** kart. Gerçek tıklama reklam katmanı nedeniyle doğrulanmadı; URL doğrudan doğrulandı. |

### C. Sepete Ekleme (Cart — Add)

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| C-01 | Pozitif | Ürün kartının üzerine gel, `Blue Top` için `Add to cart`a bas. | Başarı modalı açılır; sepet 1 ürün içerir. | `#cartModal` açıldı: `Added!`, `Your product has been added to cart.`, `View Cart`, `Continue Shopping`. Sepette `Blue Top`, miktar `1`, toplam `Rs. 500`. |
| C-02 | Pozitif | Modalda `View Cart`a bas. | `/view_cart` açılır; ürün adı, kategori, fiyat, miktar ve satır toplamı doğru görünür. | URL `/view_cart`; satır `#product-1`: `Blue Top`, `Women > Tops`, `Rs. 500`, miktar `1`, satır toplamı `Rs. 500`. |
| C-03 | Pozitif | Modalda `Continue Shopping`a bas. | Modal kapanır; kullanıcı ürün listesinde kalır; sepet korunur. | Butona basıldı; URL `/products` olarak kaldı, modal kapandı; sepet sonrasında kontrol edildiğinde eklenen ürün (`product-1`) korundu. |
| C-04 | Pozitif | Aynı ürünü ikinci kez sepete ekle. | Yeni satır açılmaz; miktar 2'ye, satır toplamı `Rs. 1000`'a çıkar. | Tek satır `#product-1`, miktar `2`, toplam `Rs. 1000` (fiyat `Rs. 500` sabit kaldı). |
| C-05 | Pozitif | Ürün detayında miktarı `3` yapıp `Add to cart`a bas. | Sepette miktar 3, satır toplamı birim fiyat × 3 olur. | `Men Tshirt` (id 2), miktar `3`, birim `Rs. 400`, toplam `Rs. 1200`. |
| C-06 | Negatif | Hover yapmadan `Add to cart`a erişmeye çalış. | Buton gizli kalmalı; yanlışlıkla ekleme yapılmamalı. | **Varsayım yanlış çıktı:** hover öncesinde de `opacity: 1`, `isVisible() = true`; hover sonrası değişmedi. `click({force:true})` ile ürün (`product-5`) sorunsuz sepete eklendi ve `Added!` modalı göründü. |
| C-07 | Negatif | Miktar alanına `0` girip ekle (HTML `min="1"` ihlali). | Geçersiz miktar engellenmeli ya da 1'e normalize edilmeli; yanıltıcı "Added!" mesajı çıkmaz. | Input `0` değerini aldı (`validity.valid = false`) ve yine `Added!` modalı göründü. Sepet miktarı önceki `3` olarak kaldı (0 eklenmiş gibi). Bu davranış olası kusur olarak işaretlendi. |
| C-08 | Sınır | Miktar alanına negatif sayı (`-1`) girip ekle. | Negatif miktar kabul edilmemeli. | `validity.valid = false` olmasına rağmen `Added!` modalı göründü; ürün sepette yokken satır oluşmadı. Ardından aynı ürüne `9999` eklenince miktar `9998` göründü → `-1` değeri sessizce toplama dahil edildi. Olası kusur. |
| C-09 | Sınır | Miktar alanına çok büyük sayı (örn. `9999`) girip ekle. | Uygulama çökmez; toplam doğru hesaplanır ya da üst sınır uygulanır. | Üst sınır yok: miktar `9999` kabul edildi, satır toplamı `Rs. 9998000` (önceki `-1` birikimiyle miktar `9998`). Uygulama çökmedi; ancak makul bir üst sınır/explicit doğrulama yok. |
| C-10 | Sınır | Sepeti yenileme/ Sayfa geçişi sonrası kontrol et. | Sepet içeriği korunur. | `Men Tshirt` × 3 satırı sayfa gezinmeleri ve yenileme sonrası aynı kaldı. |
| C-11 | Pozitif | Farklı iki ürün ekle. | İki ayrı satır oluşur; her satırın toplamı ayrı hesaplanır. | Sepette `#product-2` (qty 3) ve `#product-1` (qty 1) aynı anda durdu; daha sonra `#product-5` de ayrı satır olarak eklendi. Toplamlar satır bazında hesaplandı. |

### D. Sepetten Çıkarma (Cart — Remove)

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| D-01 | Pozitif | Sepetteki ürünün `cart_quantity_delete` (×) linkine bas. | Satır silinir; sepet boş durum mesajına döner. | `Blue Top` satırı silindi; satır sayısı `0`; mesaj `Cart is empty! Click here to buy products.` göründü. |
| D-02 | Sınır | Boş sepette `here` linkine bas. | `/products` sayfasına gidilir; alışverişe devam edilebilir. | Link `<a href="/products"><u>here</u></a>` olarak doğrulandı; tıklamada reklam vigneti devreye girdiği için gezinme sonucu doğrulanmadı (URL `#google_vignette` kaldı). |
| D-03 | Negatif | Boş sepetteyken ürün silme linki ara. | Silme kontrolü görünmemeli; hata oluşmamalı. | Satır olmadığı için silme linki yok; hata görünmedi. |
| D-04 | Negatif | Boş sepette `Proceed To Checkout` ile ödeme adımına geçmeye çalış. | Ödeme engellenmeli ya da kullanıcıya uyarı verilmeli. | Boş sepette `Proceed To Checkout` öğeleri hiç yok (dolu sepette görünür); dolayısıyla tıklama mümkün değil. |
| D-05 | Sınır | Miktarı 2 olan ürünü sil. | Satır tamamen kalkar; miktar kısmi azalmaz. | `Winter Top` (id 5) miktar 2, toplam `Rs. 1200` iken silindi; satır tamamen kalktı. **Dikkat:** silme async; tıklamayı hemen izleyen okumada satır sayısı hâlâ `1` görüldü, sayfa yenilendiğinde `0`/`Cart is empty!` oldu. Testlerde `expect(...).toHaveCount(0)` gibi bekleyen assertion gerekir. |
| D-06 | Negatif | Silme sonrası sayfayı yenile. | Ürün geri gelmez; sepet boş kalır. | Silme sonrası yenileme yapıldı: satır sayısı `0`, `Cart is empty!` mesajı korundu; ürün geri gelmedi. |
| D-07 | Sınır | Miktar butonuna basarak miktar değiştirmeyi dene. | Miktar değiştirilebiliyorsa buton aktif olmalı; değilse pasif olmalı. | `.cart_quantity button` sınıfı `disabled`; miktar sepette bu yolla değiştirilemiyor. |

### E. Genel / Teknik Kontroller

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| E-01 | Negatif | Reklam vigneti açıkken ürün/filtre tıklamalarını dene. | Testler kararlı olmalı; katman etkileşimi engellememeli. | Vignette sayfayı `aria-hidden="true"` yaptı ve tıklamaları engelledi; kapatıldıktan sonra akış normal devam etti. Otomasyonda katman temizliği/fixture gerekir. |
| E-02 | Negatif | Konsol hatalarını izle. | İşlevsellik etkileyen hata olmamalı. | Her sayfada ~3 hata (reklam/favicon kaynaklı); işlevleri etkilemedi, bilinen gürültü olarak kabul edilecek. |
| E-03 | Sınır | Arama sonucu 0 iken sepete ürün eklemeye çalış. | Sonuç yoksa sepete eklenecek ürün olmamalı. | `<script>` ve `zzzznotexist` aramalarında `.productinfo` sayısı `0`, dolayısıyla `a.add-to-cart` sayısı da `0`; ekleme yapılabilecek bir kontrol yok. |
| E-04 | Pozitif | Tüm akışı uçtan uca tekrarla: ara → filtrele → sepete ekle → sepeti görüntüle → sil. | Her adım tutarlı durum geçişi üretir; son durum boş sepettir. | Keşifte ara (`Tshirt`, `top`) → kategori (`Tops`) → marka (`Polo`) → ürün detay/ekleme → `/view_cart` → silme adımları tek oturumda çalıştırıldı; sepet son durumda boş (`Cart is empty!`) ve yenileme sonrası da boş kaldı. |

## Uygulama Kuralıyla İlgili Açık Noktalar

1. Kategori ve marka filtreleri aynı anda uygulanmıyor (B-03). Beklenen davranış mı, mevcut kusur mu? Ürün kuralı netleşene kadar mevcut davranış kayıt altında.
2. Geçersiz miktarlarda (`0`, `-1`) başarı modalı görünmesi ve `-1`'in sonraki eklemede miktarı azaltması (C-07, C-08) olası kusur; ürün kuralıyla doğrulanmalı. `9999` için üst sınır yok (C-09).
3. Arama/filtre boş sonuçlarında kullanıcıya mesaj gösterilmemesi (A-04, A-05, B-04) eksikilik mi?
4. Arama alanının yalnızca `/products` sayfasında bulunması (B-05) tasarım kararı mı?
5. Kalan kısmi doğrulamalar: B-07 (gerçek tıklama yerine doğrudan URL), D-02 (reklam katmanı nedeniyle gezinme sonucu), C-03 (modal kapanması görsel doğrulama yerine sınıf/href kontrolü). Bunlar otomasyon aşamasında tekrar çalıştırılacak. Diğer tüm senaryolar keşifte gözlemlendi.

## Sonraki Adım

Bu plan onaylandıktan sonra Playwright testleri yazılacak; her senaryo için "Beklenen Sonuç" assertion olarak ifade edilecek, "Gözlenen Davranış" ise test çıktısıyla karşılaştırılacak. **Bu aşamada kod üretilmedi.**
