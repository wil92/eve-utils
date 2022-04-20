![Twitter Follow](https://img.shields.io/twitter/follow/ggjnez92?logo=twitter&style=for-the-badge)
![GitHub followers](https://img.shields.io/github/followers/wil92?logo=github&style=for-the-badge)

# EVE utils

Calculate the best market opportunities in the game [EVE online](https://www.eveonline.com/).

![app preview](https://user-images.githubusercontent.com/10768089/149507377-d607cab1-df56-4fa0-aeeb-0a5e9c04d8bb.png)

## Open DB diagram

[https://www.diagrameditor.com/](https://www.diagrameditor.com/)

```extra/eve-utils-diagram.drawio```

> Note: SQLite is used in the application

## Deploy new version

1. Update the application version in the package.json file
2. Create a new tag with the version number
    ```
    git tag -a v*.*.* -m "*.*.*"
    ```
3. Push the tag to the remote repository
    ```
    git push --tags
    ```

> Note: After this 3 steps the GitHub actions will do all the magic by itself 

## License

- [MIT](./LICENSE.md)
