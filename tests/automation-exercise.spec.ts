import { expect, test, type Page } from "@playwright/test";
// Harici demo sitesinin aralıklı "heavy load" yanıtlarına karşı dosya bazlı retry
test.describe.configure({ retries: 2 });
const BASE_URL = "https://automationexercise.com";
const AD_REQUEST_PATTERN = /googlesyndication|doubleclick|googleads/i;
const QUEUE_FULL_PATTERN = /heavy load \(queue full\)/i;
const RETRY_INTERVALS = [250, 500, 1000, 2000];

const searchInput = (page: Page) =>
  page.getByRole("textbox", { name: "Search Product" });
const searchButton = (page: Page) => page.locator("#submit_search");
const sectionHeading = (page: Page) =>
  page.locator(".features_items > h2.title");
const productCards = (page: Page) =>
  page.locator(".features_items .productinfo");
const cartModal = (page: Page) => page.locator("#cartModal");
const cartRows = (page: Page) => page.locator("#cart_info_table tbody tr");
const emptyCartMessage = (page: Page) =>
  page.locator("p.text-center").filter({ hasText: "Cart is empty!" });

async function normalizedHeading(page: Page): Promise<string> {
  return ((await sectionHeading(page).textContent()) ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

async function gotoReady(page: Page, path: string, ready: () => Promise<void>) {
  await expect(async () => {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: QUEUE_FULL_PATTERN }),
    ).toHaveCount(0);
    await ready();
  }).toPass({ timeout: 15_000, intervals: RETRY_INTERVALS });
}

async function searchFor(page: Page, term: string) {
  await searchInput(page).fill(term);
  await searchButton(page).click();
}

async function addFromListing(page: Page, id: number) {
  const link = page.locator(
    `.features_items .productinfo a.add-to-cart[data-product-id="${id}"]`,
  );
  await expect(async () => {
    if (
      await cartModal(page).evaluate((element) =>
        element.classList.contains("show"),
      )
    ) {
      await continueShopping(page);
    }
    const [response] = await Promise.all([
      page.waitForResponse((response) =>
        response.url().includes(`/add_to_cart/${id}`),
      ),
      link.click(),
    ]);
    expect(await response.text()).not.toMatch(QUEUE_FULL_PATTERN);
  }).toPass({ timeout: 15_000, intervals: RETRY_INTERVALS });
}

async function addFromDetails(page: Page, id: number, quantity: number) {
  await page.goto(`${BASE_URL}/product_details/${id}`);
  await page.locator("#quantity").fill(String(quantity));
  await page.locator("button.cart").click();
}

async function continueShopping(page: Page) {
  await page.getByRole("button", { name: "Continue Shopping" }).click();
}

async function openCartFromModal(page: Page) {
  await Promise.all([
    page.waitForURL(/\/view_cart$/, { waitUntil: "domcontentloaded" }),
    cartModal(page).locator('a[href="/view_cart"]').click(),
  ]);
  await expect(async () => {
    if (await page.getByRole("heading", { name: QUEUE_FULL_PATTERN }).count()) {
      await page.reload({ waitUntil: "domcontentloaded" });
    }
    await expect(page.locator("#cart_info_table")).toBeVisible();
  }).toPass({ timeout: 15_000, intervals: RETRY_INTERVALS });
}

async function removeCartRow(page: Page, id: number) {
  await page.locator(`#product-${id} a.cart_quantity_delete`).click();
  await page.locator(`#product-${id}`).waitFor({ state: "detached" });
}

test.beforeEach(async ({ page }) => {
  await page.route(
    (url) => AD_REQUEST_PATTERN.test(url.toString()),
    (route) => route.abort(),
  );
  await gotoReady(page, "/products", async () => {
    await expect(searchInput(page)).toBeVisible();
  });
});

test.describe("A. Ürün Arama", () => {
  test("A-01 Tshirt araması eşleşen ürünleri listeler", async ({ page }) => {
    await searchFor(page, "Tshirt");

    await expect(page).toHaveURL(/\/products\?search=Tshirt$/);
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(6);
    await expect(productCards(page).first()).toContainText("Men Tshirt");
    await expect(productCards(page).last()).toContainText(
      "GRAPHIC DESIGN MEN T SHIRT - BLUE",
    );
  });

  test("A-02 küçük harfli arama büyük/küçük harf farkını görmez", async ({
    page,
  }) => {
    await searchFor(page, "top");

    await expect(page).toHaveURL(/\/products\?search=top$/);
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(14);
    await expect(productCards(page).first()).toContainText("Blue Top");
  });

  test("A-03 arama sonucundaki View Product detay sayfasını açar", async ({
    page,
  }) => {
    await searchFor(page, "top");
    await page
      .locator('.features_items a[href^="/product_details/"]')
      .first()
      .click();

    await expect(page).toHaveURL(/\/product_details\/1$/);
    await expect(page).toHaveTitle("Automation Exercise - Product Details");
    await expect(page.locator(".product-information h2")).toHaveText(
      "Blue Top",
    );
  });

  test("A-04 var olmayan ürün araması sonuç üretmez", async ({ page }) => {
    await searchFor(page, "zzzznotexist");

    await expect(page).toHaveURL(/\/products\?search=zzzznotexist$/);
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(0);
    await expect(page.locator(".features_items a.add-to-cart")).toHaveCount(0);
  });

  test("A-05 SQL benzeri girdi tüm ürünleri dökmez", async ({ page }) => {
    await searchFor(page, "' OR 1=1 --");

    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(0);
    await expect(page).toHaveURL(/search=%27%20OR%201=1%20--$/);
  });

  test("A-06 HTML içeren arama girdisi script olarak çalışmaz", async ({
    page,
  }) => {
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });

    await searchFor(page, "<script>alert(1)</script>");

    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(0);
    await expect(
      page.locator("script").filter({ hasText: "alert(1)" }),
    ).toHaveCount(0);
    expect(dialogs).toEqual([]);
  });

  test("A-07 boş arama tüm ürünleri gösterir", async ({ page }) => {
    await searchFor(page, "");

    await expect(page).toHaveURL(/\/products\?search=$/);
    await expect(sectionHeading(page)).toHaveText("All Products");
    await expect(productCards(page)).toHaveCount(34);
  });

  test("A-08 yalnızca boşluk içeren arama boş arama gibi davranır", async ({
    page,
  }) => {
    await searchFor(page, "   ");

    await expect(page).toHaveURL(/\/products\?search=$/);
    await expect(searchInput(page)).toHaveValue("");
    await expect(sectionHeading(page)).toHaveText("All Products");
    await expect(productCards(page)).toHaveCount(34);
  });

  test("A-09 300 karakterlik arama kırpılmaz ve sonuç üretmez", async ({
    page,
  }) => {
    const longTerm = "a".repeat(300);
    await searchFor(page, longTerm);

    await expect(searchInput(page)).toHaveValue(longTerm);
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(0);
  });

  test("A-10 tek karakterli arama sonuç üretir", async ({ page }) => {
    await searchFor(page, "a");

    await expect(page).toHaveURL(/\/products\?search=a$/);
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(18);
  });

  test("A-11 arama terimi yenileme sonrası URL üzerinden korunur", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/products?search=top`);
    await expect(searchInput(page)).toHaveValue("top");
    await expect(productCards(page)).toHaveCount(14);

    await page.reload();

    await expect(searchInput(page)).toHaveValue("top");
    await expect(sectionHeading(page)).toHaveText("Searched Products");
    await expect(productCards(page)).toHaveCount(14);
  });
});

test.describe("B. Kategori ve Marka Filtreleri", () => {
  test("B-01 Women > Tops kategorisi 6 ürün listeler", async ({ page }) => {
    await page.locator('a[href="#Women"]').click();
    await page.locator('#Women a[href="/category_products/2"]').click();

    await expect(page).toHaveURL(/\/category_products\/2$/);
    await expect(page).toHaveTitle("Automation Exercise - Tops Products");
    expect(await normalizedHeading(page)).toBe("Women - Tops Products");
    await expect(productCards(page)).toHaveCount(6);
    await expect(productCards(page).first()).toContainText("Blue Top");
  });

  test("B-02 kategori sayfasından Polo markası seçilebilir", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/category_products/2`);
    await page.locator('.brands-name a[href="/brand_products/Polo"]').click();

    await expect(page).toHaveURL(/\/brand_products\/Polo$/);
    expect(await normalizedHeading(page)).toBe("Brand - Polo Products");
    await expect(productCards(page)).toHaveCount(6);
  });

  test("B-03 kategori + marka birlikte filtrelenmesi bekleniyor", async ({
    page,
  }) => {
    test.fixme(
      "Kategori ve markanın birlikte mi yoksa birbirinin yerine mi filtrelendiği ürün kuralında net değil.",
    );
  });

  test("B-04 geçersiz marka boş ürün listesi üretir", async ({ page }) => {
    await page.goto(`${BASE_URL}/brand_products/NoSuchBrand`);

    await expect(page).toHaveTitle(
      "Automation Exercise - NoSuchBrand Products",
    );
    expect(await normalizedHeading(page)).toBe("Brand - NoSuchBrand Products");
    await expect(productCards(page)).toHaveCount(0);
  });

  test("B-05 arama alanı kategori sayfalarında da bulunmalı", async ({
    page,
  }) => {
    test.fixme(
      "Arama alanının yalnızca /products sayfasında mı yoksa tüm katalog sayfalarında mı olması gerektiği net değil.",
    );
  });

  test("B-06 tüm kategori ve marka sayfaları beklenen ürün sayısını gösterir", async ({
    page,
  }) => {
    test.slow();
    const pages = [
      {
        path: "/category_products/1",
        heading: "Women - Dress Products",
        count: 3,
      },
      {
        path: "/category_products/2",
        heading: "Women - Tops Products",
        count: 6,
      },
      {
        path: "/category_products/3",
        heading: "Men - Tshirts Products",
        count: 6,
      },
      {
        path: "/category_products/4",
        heading: "Kids - Dress Products",
        count: 6,
      },
      {
        path: "/category_products/5",
        heading: "Kids - Tops & Shirts Products",
        count: 7,
      },
      {
        path: "/category_products/6",
        heading: "Men - Jeans Products",
        count: 3,
      },
      {
        path: "/category_products/7",
        heading: "Women - Saree Products",
        count: 3,
      },
      {
        path: "/brand_products/Polo",
        heading: "Brand - Polo Products",
        count: 6,
      },
      {
        path: "/brand_products/H&M",
        heading: "Brand - H&M Products",
        count: 5,
      },
      {
        path: "/brand_products/Madame",
        heading: "Brand - Madame Products",
        count: 5,
      },
      {
        path: "/brand_products/Mast & Harbour",
        heading: "Brand - Mast & Harbour Products",
        count: 3,
      },
      {
        path: "/brand_products/Babyhug",
        heading: "Brand - Babyhug Products",
        count: 4,
      },
      {
        path: "/brand_products/Allen Solly Junior",
        heading: "Brand - Allen Solly Junior Products",
        count: 3,
      },
      {
        path: "/brand_products/Kookie Kids",
        heading: "Brand - Kookie Kids Products",
        count: 3,
      },
      {
        path: "/brand_products/Biba",
        heading: "Brand - Biba Products",
        count: 5,
      },
    ];

    for (const item of pages) {
      await gotoReady(page, item.path, async () => {
        await expect(sectionHeading(page)).toHaveText(item.heading);
        await expect(productCards(page)).toHaveCount(item.count);
      });
    }
  });

  test("B-07 & içeren marka adı doğru encode edilip açılır", async ({
    page,
  }) => {
    await page
      .locator('.brands-name a[href="/brand_products/Mast & Harbour"]')
      .click();

    await expect(page).toHaveURL(/\/brand_products\/Mast%20&%20Harbour$/);
    expect(await normalizedHeading(page)).toBe(
      "Brand - Mast & Harbour Products",
    );
    await expect(productCards(page)).toHaveCount(3);
  });
});

test.describe("C. Sepete Ekleme", () => {
  test("C-01 ürün listesinden sepete ekleme başarı modalı gösterir", async ({
    page,
  }) => {
    await addFromListing(page, 1);

    await expect(cartModal(page)).toContainText("Added!");
    await expect(cartModal(page)).toContainText(
      "Your product has been added to cart.",
    );

    await openCartFromModal(page);
    await expect(cartRows(page)).toHaveCount(1);
    await expect(page.locator("#product-1 .cart_quantity")).toHaveText("1");
  });

  test("C-02 View Cart sepet satırını doğru gösterir", async ({ page }) => {
    await addFromListing(page, 1);
    await openCartFromModal(page);

    await expect(page).toHaveURL(/\/view_cart$/);
    await expect(page.locator("#product-1 .cart_description")).toContainText(
      "Blue Top",
    );
    await expect(page.locator("#product-1 .cart_description")).toContainText(
      "Women > Tops",
    );
    await expect(page.locator("#product-1 .cart_price")).toHaveText("Rs. 500");
    await expect(page.locator("#product-1 .cart_quantity")).toHaveText("1");
    await expect(page.locator("#product-1 .cart_total")).toHaveText("Rs. 500");
  });

  test("C-03 Continue Shopping ürün listesinde kalır ve sepeti korur", async ({
    page,
  }) => {
    await addFromListing(page, 1);
    await continueShopping(page);

    await expect(page).toHaveURL(/\/products$/);
    await expect(cartModal(page)).toBeHidden();

    await page.goto(`${BASE_URL}/view_cart`);
    await expect(page.locator("#product-1")).toBeVisible();
  });

  test("C-04 aynı ürünü tekrar eklemek miktarı artırır", async ({ page }) => {
    await addFromListing(page, 1);
    await continueShopping(page);
    await addFromListing(page, 1);
    await openCartFromModal(page);

    await expect(cartRows(page)).toHaveCount(1);
    await expect(page.locator("#product-1 .cart_quantity")).toHaveText("2");
    await expect(page.locator("#product-1 .cart_total")).toHaveText("Rs. 1000");
  });

  test("C-05 ürün detayında seçilen miktar sepete yansır", async ({ page }) => {
    await addFromDetails(page, 2, 3);
    await openCartFromModal(page);

    await expect(page.locator("#product-2 .cart_quantity")).toHaveText("3");
    await expect(page.locator("#product-2 .cart_total")).toHaveText("Rs. 1200");
  });

  test("C-06 Add to cart hover olmadan da görünür ve tıklanabilir", async ({
    page,
  }) => {
    const addLink = page.locator(
      '.features_items .productinfo a.add-to-cart[data-product-id="5"]',
    );

    await expect(addLink).toBeVisible();
    await addLink.click();
    await openCartFromModal(page);

    await expect(page.locator("#product-5")).toBeVisible();
  });

  test("C-07 sıfır miktar eklenmesi yanıltıcı başarı mesajı göstermez", async ({
    page,
  }) => {
    test.fail(
      "Uygulama 0 miktarda Added! modalı gösteriyor; beklenen başarısızlık.",
    );
    await addFromDetails(page, 2, 0);

    await expect(cartModal(page)).not.toContainText("Added!");
  });

  test("C-08 negatif miktar sepette satır oluşturmaz", async ({ page }) => {
    test.fail(
      "Uygulama -1 miktarlı satır ve negatif toplam oluşturuyor; beklenen başarısızlık.",
    );
    await addFromDetails(page, 3, -1);
    await openCartFromModal(page);

    await expect(page.locator("#product-3")).toHaveCount(0);
  });

  test("C-09 çok büyük miktar doğru toplamla sepete eklenir", async ({
    page,
  }) => {
    await addFromDetails(page, 3, 9999);
    await openCartFromModal(page);

    await expect(page.locator("#product-3 .cart_quantity")).toHaveText("9999");
    await expect(page.locator("#product-3 .cart_total")).toHaveText(
      "Rs. 9999000",
    );
  });

  test("C-10 sepet içeriği sayfa yenilemesinde korunur", async ({ page }) => {
    await addFromListing(page, 1);
    await openCartFromModal(page);
    await expect(page.locator("#product-1")).toBeVisible();

    await page.reload();

    await expect(page.locator("#product-1 .cart_quantity")).toHaveText("1");
  });

  test("C-11 farklı iki ürün iki ayrı satır oluşturur", async ({ page }) => {
    await addFromListing(page, 1);
    await continueShopping(page);
    await addFromListing(page, 2);
    await openCartFromModal(page);

    await expect(cartRows(page)).toHaveCount(2);
    await expect(page.locator("#product-1")).toBeVisible();
    await expect(page.locator("#product-2")).toBeVisible();
  });
});

test.describe("D. Sepetten Çıkarma", () => {
  test("D-01 ürün silinir ve sepet boş duruma döner", async ({ page }) => {
    await addFromListing(page, 1);
    await openCartFromModal(page);
    await removeCartRow(page, 1);

    await expect(cartRows(page)).toHaveCount(0);
    await expect(emptyCartMessage(page)).toHaveText(
      "Cart is empty! Click here to buy products.",
    );
  });

  test("D-02 boş sepetteki here linki ürün sayfasına götürür", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/view_cart`);
    await expect(emptyCartMessage(page)).toBeVisible();

    await page.getByRole("link", { name: "here" }).click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(searchInput(page)).toBeVisible();
  });

  test("D-03 boş sepette silme kontrolü bulunmaz", async ({ page }) => {
    await page.goto(`${BASE_URL}/view_cart`);

    await expect(page.locator(".cart_quantity_delete")).toHaveCount(0);
    await expect(emptyCartMessage(page)).toBeVisible();
  });

  test("D-04 boş sepette ödeme adımına geçiş kontrolü görünmez", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/view_cart`);

    await expect(page.getByText("Proceed To Checkout")).toHaveCount(0);
    await expect(emptyCartMessage(page)).toBeVisible();
  });

  test("D-05 miktarı 2 olan ürün tamamen silinir", async ({ page }) => {
    await addFromDetails(page, 5, 2);
    await openCartFromModal(page);
    await expect(page.locator("#product-5 .cart_quantity")).toHaveText("2");
    await expect(page.locator("#product-5 .cart_total")).toHaveText("Rs. 1200");

    await removeCartRow(page, 5);

    await expect(page.locator("#product-5")).toHaveCount(0);
    await expect(emptyCartMessage(page)).toBeVisible();
  });

  test("D-06 silinen ürün yenileme sonrası geri gelmez", async ({ page }) => {
    await addFromListing(page, 1);
    await openCartFromModal(page);
    await removeCartRow(page, 1);

    await page.reload();

    await expect(cartRows(page)).toHaveCount(0);
    await expect(emptyCartMessage(page)).toBeVisible();
  });

  test("D-07 sepet içindeki miktar butonu değiştirilemez", async ({ page }) => {
    await addFromListing(page, 1);
    await openCartFromModal(page);

    await expect(page.locator("#product-1 .cart_quantity button")).toHaveClass(
      /disabled/,
    );
    await expect(page.locator("#product-1 .cart_quantity")).toHaveText("1");
  });
});

test.describe("E. Genel / Teknik Kontroller", () => {
  test("E-01 reklam istekleri engellendiğinde etkileşim vignette tarafından bozulmaz", async ({
    page,
  }) => {
    await page.locator('a[href="#Women"]').click();
    const topsLink = page.locator('#Women a[href="/category_products/2"]');
    await expect(topsLink).toBeVisible();

    await topsLink.click();

    await expect(page).toHaveURL(/\/category_products\/2$/);
    await expect(page).not.toHaveURL(/#google_vignette$/);
    await expect(page.locator("body")).not.toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("E-02 kritik konsol hatası olmamalı", async ({ page }) => {
    test.fixme(
      "Reklam/favicon gibi kaynaklardan gelen konsol hatalarının işlevsel kabul kriteri net değil.",
    );
  });

  test("E-03 boş arama sonucunda sepete eklenecek ürün kontrolü bulunmaz", async ({
    page,
  }) => {
    await searchFor(page, "zzzznotexist");

    await expect(productCards(page)).toHaveCount(0);
    await expect(page.locator(".features_items a.add-to-cart")).toHaveCount(0);
  });

  test("E-04 arama, filtre, ekleme, görüntüleme ve silme uçtan uca çalışır", async ({
    page,
  }) => {
    await searchFor(page, "top");
    await expect(productCards(page)).toHaveCount(14);

    await page.locator('a[href="#Women"]').click();
    await page.locator('#Women a[href="/category_products/2"]').click();
    expect(await normalizedHeading(page)).toBe("Women - Tops Products");

    await page.locator('.brands-name a[href="/brand_products/Polo"]').click();
    expect(await normalizedHeading(page)).toBe("Brand - Polo Products");

    await addFromListing(page, 1);
    await openCartFromModal(page);
    await expect(page.locator("#product-1")).toBeVisible();

    await removeCartRow(page, 1);
    await expect(emptyCartMessage(page)).toBeVisible();
  });
});
