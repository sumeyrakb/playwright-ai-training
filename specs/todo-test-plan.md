# TodoMVC Test Planı

## Kapsam ve Ortam

- **Uygulama:** https://demo.playwright.dev/todomvc/ (React • TodoMVC)
- **Odak:** Görev ekleme, silme, tamamlama ve filtreleme
- **Yöntem:** Playwright MCP ile manuel keşif; senaryolar keşif gözlemlerinden türetilmiştir.
- **Önemli not:** Bu doküman yalnızca plan ve gözlem kaydıdır; test kodu henüz yazılmadı.
- **Beklenen sonuç** = ürünün doğru davranması gerektiği kabul edilen kriter.
- **Gözlenen davranış** = keşif sırasında uygulamada fiilen görülen sonuç. Bunlar birbirinden ayrı tutulmuştur; "Doğrulanmadı" işaretli satırlar henüz uygulanmamış senaryolardır.

## Keşif Sırasında Elde Edilen Genel Bilgiler

- Giriş alanı: `input[placeholder="What needs to be done?"]`, erişilebilir adı "What needs to be done?".
- Görev satırı: `li[data-testid="todo-item"]`; başlık `label[data-testid="todo-title"]`.
- Tamamlama kutusu: `input.toggle`, erişilebilir adı "Toggle Todo".
- Silme butonu: `button.destroy`, erişilebilir adı "Delete"; DOM'da mevcut ancak satırın üzerine gelinene (hover) kadar görünür/erişilebilir değil.
- Tümünü tamamlama: `#toggle-all` / `label[for="toggle-all"]`, erişilebilir adı "❯Mark all as complete".
- Sayaç: `.todo-count` (ör. `1 item left` / `4 items left` / `0 items left`).
- Filtreler: `All` → `#/`, `Active` → `#/active`, `Completed` → `#/completed`.
- "Clear completed" butonu yalnızca tamamlanmış görev varsa görünüyor.
- Veriler `localStorage` anahtarında `react-todos` tutuluyor; sayfa yenilendiğinde korunuyor.
- Konsolda `favicon.ico` için 404 hatası var; bu işlevsel bir hata değil, bilinen gürültü olarak kabul edilecek.
- Boş durumda (tüm görevler silindiğinde) liste, sayaç/alt bilgi ve "tümünü tamamla" kontrolü tamamen kayboluyor; "henüz görev yok" mesajı görünmüyor.

## Senaryolar

### A. Görev Ekleme

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| A-01 | Pozitif | Giriş alanına `görev 1` yazıp Enter'a bas. | Görev listeye eklenir; giriş alanı temizlenir; sayaç `1 item left` olur. | Aynı şekilde gerçekleşti: liste 1 satır, sayaç `1 item left`, input boş. |
| A-02 | Pozitif | Üç farklı görev sırayla eklenir. | Üç görev eklenir; ekleme sırası korunur; sayaç `3 items left`. | `görev 1`, `görev 2`, `boşluklu` sırasıyla eklendi; sayaç `3 items left`. |
| A-03 | Pozitif | Başta/sonda boşluk olan `   boşluklu   ` metni eklenir. | Boşluklar kırpılır, `boşluklu` olarak kaydedilir. | `boşluklu` olarak eklendi; baş/sondaki boşluklar kaldırıldı. |
| A-04 | Negatif | Tamamen boş giriş alanıyla Enter'a bas. | Yeni görev eklenmez; sayaç ve liste değişmez. | Doğrulanmadı (yalnızca boşluk içeren giriş test edildi). |
| A-05 | Negatif | Yalnızca boşluk `    ` içeren girişle Enter'a bas. | Yeni görev eklenmez; hata mesajı çıkmaz. | Görev eklenmedi, sayaç `4 items left` olarak kaldı; input içeriği `    ` olarak **temizlenmeden** kaldı. |
| A-06 | Negatif | Aynı başlığa sahip ikinci bir görev eklenir. | Beklenen davranış ürün kuralına bağlı: ya engellenmeli ya da uyarı verilmeli. | Engelleme yok; iki `görev 1` satırı bir arada duruyor, sayaç `4 items left`. Mevcut davranış "izin veriliyor" yönünde. |
| A-07 | Negatif | `<script>alert('x')</script> &amp; " ' <b>kalın</b>` eklenir. | Metin oldukça görüntülenir; HTML çalıştırılmaz; XSS oluşmaz. | Başlık düz metin olarak görüntüldi; `label` içinde `<script>` etiketi bulunmadı, script çalışmadı. |
| A-08 | Sınır | Çok uzun başlık (200+ karakter, Unicode ve rakamlar içeren) eklenir. | Başlık kırpılmadan kaydedilir; sayaç doğru güncellenir; uygulama çökmez. | ~230 karakterlik Türkçe başlık eksiksiz eklendi; sayaç `5 items left`; hata oluşmadı. |
| A-09 | Sınır | Tek karakterlik (örn. `a`) ve Türkçe karakterli başlık eklenir. | Minimum uzunluk kısıtı yoksa görev eklenir. | Doğrulanmadı (Türkçe karakterli uzun başlık doğrulandı, tek karakter doğrulanmadı). |

### B. Görev Silme

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| B-01 | Pozitif | Bir görevin üzerine gelip `Delete` butonuna tıkla. | Yalnızca o görev silinir, kalan görevlerin sırası bozulmaz, sayaç bir azalır. | İlk `görev 1` silindi; kalanlar `görev 2`, `görev 1`, `boşluklu`, `filtre icinde eklenen`; sayaç `4 items left`. |
| B-02 | Pozitif | Tamamlanmış bir görevi sil. | Görev listeden kalkar; sayaç ve "Clear completed" durumu tutarlı kalır. | Tamamlanan `görev 2`, "Clear completed" ile toplu silindi; kalan 3 aktif görev korundu. |
| B-03 | Negatif | Hover yapmadan silme butonuna erişmeye çalış. | Silme butonu gizli olmalı; yanlışlıkla silme yapılmamalı. | Buton DOM'da mevcut ama hover öncesi erişilebilir ağaçta/snapshot'ta görünmüyor; hover sonrası `button "Delete"` olarak belirdi. |
| B-04 | Negatif | Aynı başlıklı iki görevden yalnızca birini sil. | Yalnızca seçilen satır silinir, diğer aynı başlıklı görev kalır. | İlk `görev 1` silindi, ikinci `görev 1` listede kaldı. |
| B-05 | Sınır | Son kalan görevi sil. | Liste boşalır; sayaç sıfırlanır/sayaç alanı kaldırılır; "Clear completed" görünmez. | Tüm görevler "Clear completed" ile silindiğinde liste, alt bilgi ve toggle-all tamamen kayboldu; boş durum mesajı yok. |
| B-06 | Sınır | Tamamlanmış görev yokken "Clear completed" butonunu arama. | Buton görünmemeli, toplu silme yapılmamalı. | Tamamlanan görev kalmadığında buton kayboldu; listede 5 aktif görev kaldı. |

### C. Görev Tamamlama

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| C-01 | Pozitif | Bir görevin `Toggle Todo` kutusuna tıkla. | Görev tamamlandı olarak işaretlenir; sayaç bir azalır; "Clear completed" görünür. | `görev 1` işaretlendi; sayaç `3 items left`; "Clear completed" belirdi. |
| C-02 | Pozitif | Tamamlanan görevi tekrar aç. | Görev aktife döner; sayaç bir artar; tamamlanmış görev kalmadıysa "Clear completed" kaybolur. | Sayaç `5 items left` oldu; "Clear completed" kayboldu; 5 görev arasında tamamlanan kalmadı. |
| C-03 | Pozitif | "Mark all as complete" kutusuna tıkla. | Tüm görevler tamamlanır; sayaç `0 items left` olur. | 5 görevin tamamı işaretlendi; sayaç `0 items left`; "Clear completed" görünür. |
| C-04 | Sınır | "Mark all as complete" kutusuna tekrar tıkla. | Tüm görevler aktife döner; sayaç toplam göreve eşit olur. | 5 görev yeniden aktif; sayaç `5 items left`; "Clear completed" kayboldu. |
| C-05 | Negatif | Tamamlanmış görevin `All` görünümünde durması. | Tamamlanmış görev `All` içinde görünür olmalı, işaretli olmalı. | `görev 1` `All` görünümünde işaretli olarak kaldı. |
| C-06 | Sınır | Boş listede "Mark all as complete" kontrolünün durumu. | Kontrol görünmemeli. | Tüm görevler silindiğinde toggle-all kontrolü kayboldu. |
| C-07 | Negatif | Tamamlanmış görevi `Completed` filtresindeyken geri aç. | Görev tamamlanmışlar listesinden çıkar; sayaç artar. | Son tamamlanmış görev geri açıldı; `Completed` listesi boşaldı; sayaç `5 items left`; boş liste mesajı görünmedi. |

### D. Filtreleme

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| D-01 | Pozitif | `Active` filtresine tıkla. | Yalnızca aktif görevler listelenir; URL `#/active`; sayaç aktif görev sayısını gösterir. | 3 aktif görev listelendi (`görev 2`, `görev 1`, `boşluklu`); URL `#/active`; sayaç `3 items left`. |
| D-02 | Pozitif | `Completed` filtresine tıkla. | Yalnızca tamamlanmış görevler listelenir; URL `#/completed`. | Yalnızca işaretli `görev 1` listelendi; URL `#/completed`. |
| D-03 | Pozitif | `All` filtresine dön. | Tüm görevler (aktif + tamamlanmış) listelenir; URL `#/`. | 4 görev listelendi; URL `#/`. |
| D-04 | Pozitif | Filtreler arasında ileri-geri geçiş yap. | Görev verileri korunur; filtre yalnızca görünümü değiştirir. | Geçişlerde veriler korundu; tamamlanma durumu ve sayaç tutarlı kaldı. |
| D-05 | Negatif | `Completed` filtresindeyken yeni (aktif) görev ekle. | Yeni görev aktif olduğu için `Completed` listesinde görünmemeli; sayaç artmalı. | `filtre icinde eklenen` görünmedi; sayaç `3 items left` → `4 items left` oldu; URL `#/completed` kaldı. |
| D-06 | Sınır | Hiç tamamlanmış görev yokken `Completed` filtresini aç. | Boş liste görünür; hata oluşmaz. | C-07 sonrası `Completed` görünümünde liste boştu; hata/yönlendirme oluşmadı. |
| D-07 | Sınır | Hiç aktif görev yokken `Active` filtresini aç. | Boş liste görünür; sayaç `0 items left` olur. | Doğrulanmadı. |
| D-08 | Negatif | `Completed` filtresindeyken bir görevi sil. | Silinen görev listeden kalkar; diğer filtrelerde de yer almaz. | Doğrulanmadı (silme `All` görünümünde doğrulandı). |

### E. Kalıcılık ve Genel

| ID | Tür | Senaryo / Adımlar | Beklenen Sonuç | Gözlenen Davranış (Keşif) |
|---|---|---|---|---|
| E-01 | Pozitif | Görev ekleyip sayfayı yenile. | Görevler ve tamamlanma durumları korunur. | 3 görev yenileme sonrası aynı şekilde listelendi; sayaç `3 items left`; `localStorage.react-todos` verisi mevcut. |
| E-02 | Negatif | Konsol hatalarını kontrol et. | İşlevsellik etkileyen hata olmamalı. | `favicon.ico` için 404 hatası var; uygulama işlevlerini etkilemiyor. Testlerde bilinen gürültü olarak değerlendirilecek. |
| E-03 | Sınır | Filtre seçiliyken sayfa yenile. | URL'deki filtre korunur ya da varsayılan `All`'a döner; veri kaybı olmaz. | Doğrulanmadı. |

## Uygulama Kuralıyla İlgili Açık Noktalar

1. Aynı başlıklı görevlere izin verilmesi beklenen davranış mı, yoksa kusur mu? Ürün kuralı netleşene kadar A-06 mevcut davranışı kayıt altına alır.
2. Yalnızca boşluk içeren girişte input'un temizlenmemesi (A-05) kusur mu, kabul edilebilir mi?
3. Boş durumda kullanıcıya mesaj gösterilmemesi (B-05, D-06) eksikilik mi?
4. Doğrulanmamış senaryolar (A-04, A-09, D-07, D-08, E-03) test otomasyonu aşamasında çalıştırılacak ve bu tablo güncellenecek.

## Sonraki Adım

Bu plan onaylandıktan sonra Playwright testleri yazılacak; her senaryo için beklenen sonuç assertion olarak ifade edilecek, gözlenen davranış ise test çıktısıyla karşılaştırılacak. Şu aşamada kod üretilmedi.
