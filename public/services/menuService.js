const {Menu: MenuService} = require("electron");

module.exports = (window) => ({
  window,

  createMenu() {
    if (!this.menu) {
      this.menu = MenuService.buildFromTemplate(this.getMenuLabel());
    }
    return this.menu;
  },

  getMenuLabel() {
    return [
      {
        label: 'App',
        submenu: [
          // {
          //   role: 'syncData', label: 'Sync data', click: async () => {
          //     window.webContents.send('in-message', {type: 'show-sync-data-dialog'});
          //   }
          // },
          {type: 'separator'},
          {role: 'quit', label: 'Quit'}
        ]
      },
      // toDo 12.04.22, guille, add the help area to the app
      // {label: 'Help'}
    ];
  }
});
