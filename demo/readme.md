# Demo/test extension for `webext-permission-toggle`

First install `web-ext` globally:

```sh
npm i -g web-ext
```

To manually test the module, first run this the top-level directory of
the repo:

```sh
npm run watch
```

Now leave that running and simultaneously run the following, which
will run parcel to build the extension:

```sh
npm run demo:watch
```

Now you can launch various browser test combinations, e.g.

```sh
web-ext run -t firefox-desktop
web-ext run -t chromium
```

In Chrome and Chromium, in order to view the background worker console
debug messages, you'll need to enable Developer mode in
`chrome://extensions/`.
