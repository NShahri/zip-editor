# Zip Editor


## How to re-zip to a new file 
```js
const zipEditor = await zipEditor('currentFile.zip');

zipFileOutputStream
    .pipe(fs.createWriteStream('newFile.zip'))
    .on('finish', function() {
        console.log('done');
    });
```

## How to filter some files by path

```js
zipFileOutputStream
    .pipe(fs.createWriteStream('newFile.zip'), {
        onEntryCallback: ({path}) => path === 'content1.txt'
    })
    .on('finish', function() {
        console.log('done');
    });
```

