import { expect, test, type Page } from '@playwright/test';

const APP_URL = 'https://demo.playwright.dev/todomvc/';
const LONG_TITLE = 'Çok uzun bir görev başlığı — bu metin sınır değer testi için kullanılıyor ve ekranda taşma olup olmadığını görmek amaçlıdır. 1234567890 1234567890 1234567890 1234567890 1234567890 1234567890 1234567890 1234567890 1234567890 1234567890';
const HTML_TITLE = `<script>alert('x')</script> &amp; " ' <b>kalın</b>`;

const newTodo = (page: Page) => page.getByRole('textbox', { name: 'What needs to be done?' });
const items = (page: Page) => page.getByTestId('todo-item');
const titles = (page: Page) => page.getByTestId('todo-title');
const counter = (page: Page) => page.locator('.todo-count');
const clearCompleted = (page: Page) => page.getByRole('button', { name: 'Clear completed' });
const toggleAllInput = (page: Page) => page.locator('#toggle-all');
const toggleAllLabel = (page: Page) => page.locator('label[for="toggle-all"]');
const checkedToggles = (page: Page) => page.locator('li[data-testid="todo-item"] input.toggle:checked');
const allToggles = (page: Page) => page.locator('li[data-testid="todo-item"] input.toggle');

async function addTodo(page: Page, title: string) {
  await newTodo(page).fill(title);
  await newTodo(page).press('Enter');
}

async function completeTodo(page: Page, index: number) {
  await items(page).nth(index).locator('input.toggle').check();
}

async function deleteTodo(page: Page, index: number) {
  const item = items(page).nth(index);
  await item.hover();
  await item.getByRole('button', { name: 'Delete' }).click();
}

async function openFilter(page: Page, name: 'All' | 'Active' | 'Completed') {
  await page.getByRole('link', { name, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.removeItem('react-todos'));
  await page.reload();
  await expect(newTodo(page)).toBeVisible();
});

test.describe('TodoMVC', () => {
  test.describe('Ekleme', () => {
    test('A-01 tek görev Enter ile eklenir ve sayaç güncellenir', async ({ page }) => {
      await addTodo(page, 'görev 1');

      await expect(newTodo(page)).toHaveValue('');
      await expect(titles(page)).toHaveText(['görev 1']);
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('A-02 birden fazla görev eklenme sırasıyla listelenir', async ({ page }) => {
      await addTodo(page, 'birinci');
      await addTodo(page, 'ikinci');
      await addTodo(page, 'üçüncü');

      await expect(titles(page)).toHaveText(['birinci', 'ikinci', 'üçüncü']);
      await expect(counter(page)).toHaveText('3 items left');
    });

    test('A-03 baş ve sondaki boşluklar kırpılarak eklenir', async ({ page }) => {
      await addTodo(page, '   boşluklu   ');

      await expect(titles(page)).toHaveText(['boşluklu']);
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('A-04 boş girişle görev eklenmez', async ({ page }) => {
      await newTodo(page).fill('');
      await newTodo(page).press('Enter');

      await expect(items(page)).toHaveCount(0);
      await expect(counter(page)).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test('A-05 yalnızca boşluk içeren girişle görev eklenmez', async ({ page }) => {
      await newTodo(page).fill('    ');
      await newTodo(page).press('Enter');

      await expect(items(page)).toHaveCount(0);
      await expect(counter(page)).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test('A-07 HTML içeren başlık düz metin olarak işlenir', async ({ page }) => {
      await addTodo(page, HTML_TITLE);

      await expect(titles(page)).toHaveText([HTML_TITLE]);
      await expect(page.locator('.todo-list script')).toHaveCount(0);
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('A-08 uzun başlık kırpılmadan kaydedilir', async ({ page }) => {
      await addTodo(page, LONG_TITLE);

      await expect(titles(page)).toHaveText([LONG_TITLE]);
      await expect(counter(page)).toHaveText('1 item left');
    });
  });

  test.describe('Silme', () => {
    test('B-01 tek görev silinir, diğerlerinin sırası korunur', async ({ page }) => {
      await addTodo(page, 'birinci');
      await addTodo(page, 'ikinci');
      await addTodo(page, 'üçüncü');

      await deleteTodo(page, 0);

      await expect(titles(page)).toHaveText(['ikinci', 'üçüncü']);
      await expect(counter(page)).toHaveText('2 items left');
    });

    test('B-02 tamamlanmış görev tekil olarak silinebilir', async ({ page }) => {
      await addTodo(page, 'aktif');
      await addTodo(page, 'tamam');
      await completeTodo(page, 1);

      await deleteTodo(page, 1);

      await expect(titles(page)).toHaveText(['aktif']);
      await expect(counter(page)).toHaveText('1 item left');
      await expect(clearCompleted(page)).toHaveCount(0);
    });

    test('B-03 silme butonu hover öncesi gizli, hover sonrası görünür', async ({ page }) => {
      await addTodo(page, 'silinecek');
      const item = items(page).first();
      const deleteButton = item.getByRole('button', { name: 'Delete' });

      await expect(deleteButton).toBeHidden();
      await item.hover();
      await expect(deleteButton).toBeVisible();

      await deleteButton.click();
      await expect(items(page)).toHaveCount(0);
    });

    test('B-04 aynı başlıklı iki görevden yalnızca seçilen silinir', async ({ page }) => {
      await addTodo(page, 'aynı');
      await addTodo(page, 'aynı');

      await deleteTodo(page, 0);

      await expect(titles(page)).toHaveText(['aynı']);
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('B-05 son görev silindiğinde boş durum oluşur', async ({ page }) => {
      await addTodo(page, 'son görev');

      await deleteTodo(page, 0);

      await expect(items(page)).toHaveCount(0);
      await expect(clearCompleted(page)).toHaveCount(0);
      await expect(toggleAllInput(page)).toHaveCount(0);
    });

    test('B-06 tamamlanmış görev yoksa Clear completed görünmez', async ({ page }) => {
      await addTodo(page, 'aktif bir');
      await addTodo(page, 'aktif iki');

      await expect(clearCompleted(page)).toHaveCount(0);
      await expect(titles(page)).toHaveText(['aktif bir', 'aktif iki']);
    });

    test('B-07 Clear completed yalnızca tamamlanmışları siler', async ({ page }) => {
      await addTodo(page, 'aktif');
      await addTodo(page, 'tamam');
      await completeTodo(page, 1);

      await expect(clearCompleted(page)).toBeVisible();
      await clearCompleted(page).click();

      await expect(titles(page)).toHaveText(['aktif']);
      await expect(counter(page)).toHaveText('1 item left');
      await expect(clearCompleted(page)).toHaveCount(0);
    });
  });

  test.describe('Tamamlama', () => {
    test('C-01 görev tamamlandığında sayaç azalır ve Clear completed görünür', async ({ page }) => {
      await addTodo(page, 'görev');

      await completeTodo(page, 0);

      await expect(items(page).first().locator('input.toggle')).toBeChecked();
      await expect(counter(page)).toHaveText('0 items left');
      await expect(clearCompleted(page)).toBeVisible();
    });

    test('C-02 görev geri açıldığında sayaç artar ve Clear completed kaybolur', async ({ page }) => {
      await addTodo(page, 'görev');
      await completeTodo(page, 0);

      await items(page).first().locator('input.toggle').uncheck();

      await expect(items(page).first().locator('input.toggle')).not.toBeChecked();
      await expect(counter(page)).toHaveText('1 item left');
      await expect(clearCompleted(page)).toHaveCount(0);
    });

    test('C-03 tüm görevler tamamlanabilir', async ({ page }) => {
      await addTodo(page, 'bir');
      await addTodo(page, 'iki');

      await toggleAllLabel(page).click();

      await expect(checkedToggles(page)).toHaveCount(2);
      await expect(allToggles(page)).toHaveCount(2);
      await expect(counter(page)).toHaveText('0 items left');
      await expect(clearCompleted(page)).toBeVisible();
    });

    test('C-04 tüm görevler geri açılabilir', async ({ page }) => {
      await addTodo(page, 'bir');
      await addTodo(page, 'iki');
      await toggleAllLabel(page).click();

      await toggleAllLabel(page).click();

      await expect(checkedToggles(page)).toHaveCount(0);
      await expect(counter(page)).toHaveText('2 items left');
      await expect(clearCompleted(page)).toHaveCount(0);
    });

    test('C-05 tamamlanmış görev All görünümünde işaretli kalır', async ({ page }) => {
      await addTodo(page, 'aktif');
      await addTodo(page, 'tamam');
      await completeTodo(page, 1);

      await expect(items(page)).toHaveCount(2);
      await expect(items(page).nth(1).locator('input.toggle')).toBeChecked();
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('C-06 boş listede tümünü tamamla kontrolü görünmez', async ({ page }) => {
      await expect(toggleAllInput(page)).toHaveCount(0);
      await expect(toggleAllLabel(page)).toHaveCount(0);
      await expect(items(page)).toHaveCount(0);
    });

    test('C-07 Completed filtresinde son görev geri açıldığında liste boşalır', async ({ page }) => {
      await addTodo(page, 'tamam');
      await completeTodo(page, 0);
      await openFilter(page, 'Completed');

      await items(page).first().locator('input.toggle').click();

      await expect(items(page)).toHaveCount(0);
      await expect(counter(page)).toHaveText('1 item left');
      await expect(page).toHaveURL(/#\/completed$/);
    });
  });

  test.describe('Filtreleme', () => {
    test.beforeEach(async ({ page }) => {
      await addTodo(page, 'aktif');
      await addTodo(page, 'tamam');
      await completeTodo(page, 1);
    });

    test('D-01 Active filtresi yalnızca aktif görevleri gösterir', async ({ page }) => {
      await openFilter(page, 'Active');

      await expect(titles(page)).toHaveText(['aktif']);
      await expect(counter(page)).toHaveText('1 item left');
      await expect(page).toHaveURL(/#\/active$/);
    });

    test('D-02 Completed filtresi yalnızca tamamlanmış görevleri gösterir', async ({ page }) => {
      await openFilter(page, 'Completed');

      await expect(titles(page)).toHaveText(['tamam']);
      await expect(page).toHaveURL(/#\/completed$/);
    });

    test('D-03 All filtresi tüm görevleri gösterir', async ({ page }) => {
      await openFilter(page, 'Active');
      await openFilter(page, 'All');

      await expect(titles(page)).toHaveText(['aktif', 'tamam']);
      await expect(page).toHaveURL(/#\/$/);
    });

    test('D-04 filtreler arası geçiş verileri korur', async ({ page }) => {
      await openFilter(page, 'Active');
      await expect(titles(page)).toHaveText(['aktif']);

      await openFilter(page, 'Completed');
      await expect(titles(page)).toHaveText(['tamam']);

      await openFilter(page, 'All');
      await expect(titles(page)).toHaveText(['aktif', 'tamam']);
      await expect(counter(page)).toHaveText('1 item left');
    });

    test('D-05 Completed filtresindeyken eklenen aktif görev listede görünmez', async ({ page }) => {
      await openFilter(page, 'Completed');

      await addTodo(page, 'yeni aktif');

      await expect(titles(page)).toHaveText(['tamam']);
      await expect(counter(page)).toHaveText('2 items left');
      await expect(page).toHaveURL(/#\/completed$/);
    });

    test('D-06 tamamlanmış görev yokken Completed filtresi boş liste gösterir', async ({ page }) => {
      await items(page).nth(1).locator('input.toggle').uncheck();

      await openFilter(page, 'Completed');

      await expect(items(page)).toHaveCount(0);
      await expect(page).toHaveURL(/#\/completed$/);
    });

    test('D-07 aktif görev yokken Active filtresi boş liste gösterir', async ({ page }) => {
      await items(page).nth(0).locator('input.toggle').check();

      await openFilter(page, 'Active');

      await expect(items(page)).toHaveCount(0);
      await expect(counter(page)).toHaveText('0 items left');
      await expect(page).toHaveURL(/#\/active$/);
    });

    test('D-08 Completed filtresinde silinen görev diğer filtrelerden de kalkar', async ({ page }) => {
      await items(page).nth(0).locator('input.toggle').check();
      await openFilter(page, 'Completed');

      await deleteTodo(page, 0);

      await expect(titles(page)).toHaveText(['tamam']);
      await expect(page).toHaveURL(/#\/completed$/);

      await openFilter(page, 'All');
      await expect(titles(page)).toHaveText(['tamam']);
    });
  });

  test.describe('Kalıcılık', () => {
    test('E-01 yenileme sonrası görevler ve tamamlanma durumu korunur', async ({ page }) => {
      await addTodo(page, 'bir');
      await addTodo(page, 'iki');
      await completeTodo(page, 1);

      await page.reload();

      await expect(titles(page)).toHaveText(['bir', 'iki']);
      await expect(items(page).nth(1).locator('input.toggle')).toBeChecked();
      await expect(counter(page)).toHaveText('1 item left');
    });
  });
});
