export function createMenu(tables) {
  return { tables, index: 0 };
}

export function moveSelection(menu, direction) {
  const n = menu.tables.length;
  menu.index = (menu.index + direction + n) % n;
}

export function selectedTable(menu) {
  return menu.tables[menu.index];
}
