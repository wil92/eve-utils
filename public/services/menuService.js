const {Menu: MenuService} = require("electron");

module.exports = (window, communicationService, dataService) => ({
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
          {
            role: 'syncData',
            label: 'Sync',
            click: async () => {
              await dataService.syncAnomaliesWithServer();
            }
          },
          {
            role: 'logout',
            label: 'Logout',
            click: async () => {
              await communicationService.logout();
            }
          },
          {type: 'separator'},
          {role: 'quit', label: 'Quit'}
        ]
      },
      // toDo 12.04.22, guille, add the help area to the app
      // {label: 'Help'}
    ];
  }
});
