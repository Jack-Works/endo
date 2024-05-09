# xs-test

These are parity tests for Endo between Node.js and XS.
The purpose of these tests is to verify that XS variants on SES and
StaticModuleRecord converge on the same behaviors when run under Node.js and
XS.

To run the Node.js tests:

```console
find test -name '*.test.js' | xargs scripts/node.js
```

The XS suite depends on Moddable’s `xst` being on the `PATH`.
To run the XS tests:

```console
find test -name '*.test.js' | xargs scripts/xst.js
```
