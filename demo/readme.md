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
will run parcel to build the `mv2` and `mv3` targets defined in
`package.json`:

```sh
npm run demo:watch
```

Now you can launch various browser test combinations, e.g.

```sh
web-ext run -s dist/mv2 -t firefox-desktop
web-ext run -s dist/mv3 -t chromium
```

Note that `package.json` specifies a default `web-ext` source
directory of `dist/mv3`.

In Chrome and Chromium, in order to view the background worker console
debug messages, you'll need to enable Developer mode in
`chrome://extensions/`.
