// @flow

import yazl from 'yazl';

import unzipBuffer from './unzipBuffer';
import unzipPath from './unzipPath';

type ExtractedFileInfoType = {|
    content: ReadableStream,
    path: string,
|};

type FileInfoType = {|
    content: ReadableStream, // TODO: | Buffer | string,
    path: string,
    options?: {
        mtime?: Date,
        mode?: 0o100664,
        compress?: boolean,
        forceZip64Format?: boolean,
        fileComment?: string,
    },
|};

type DecompressOptions = {
    decodeStrings?: boolean,
    validateEntrySizes?: boolean,
    strictFileNames?: boolean,
};

type CompressOptions = {
    forceZip64Format?: boolean,
    comment?: string,
};

type ZipEditOptions = {|
    options: DecompressOptions,
    compressOptions: CompressOptions,
    onEntryCallback: ({path: string}) => boolean,
    onErrorCallback: ({path?: string, err: Error}) => void,
    onStreamCallback: ExtractedFileInfoType => FileInfoType,
    onEndCallback: () => FileInfoType[],
|};

export default async function zipEditor(
    file: string | Buffer,
    {
        options = {},
        compressOptions = {},
        onEntryCallback = () => true,
        onEndCallback = () => [],
        onErrorCallback = console.error,
        onStreamCallback = param => ({content: param.content, path: param.path}),
    }: ZipEditOptions = {}
): Promise<ReadableStream> {
    let originalZipFile;
    if (typeof file === 'string') {
        originalZipFile = await unzipPath(file, {...options, lazyEntries: true, autoClose: false});
    } else if (Buffer.isBuffer(file)) {
        originalZipFile = await unzipBuffer(file, {...options, lazyEntries: true, autoClose: false});
    } else {
        throw new Error('Zip content type is not supported. Only string or buffer has been supported.');
    }

    const newZipFile = new yazl.ZipFile();

    originalZipFile.on('entry', function(entry) {
        if (onEntryCallback({path: entry.fileName})) {
            originalZipFile.openReadStream(entry, (err, readStream) => {
                if (err) {
                    onErrorCallback({path: entry.fileName, err});
                } else {
                    const fileInfo = onStreamCallback({path: entry.fileName, content: readStream});

                    if (fileInfo) {
                        fileInfo.content.on('error', err => {
                            onErrorCallback({path: entry.fileName, err});
                            newZipFile.outputStream.destroy(err);
                        });

                        fileInfo.content.on('end', () => {
                            originalZipFile.readEntry();
                        });

                        newZipFile.addReadStream(fileInfo.content, fileInfo.path, fileInfo.options);
                    } else {
                        originalZipFile.readEntry();
                    }
                }
            });
        } else {
            originalZipFile.readEntry();
        }
    });

    originalZipFile.on('error', function(err) {
        onErrorCallback({err});
    });

    originalZipFile.once('end', () => {
        originalZipFile.close();
        (onEndCallback() || []).forEach(f => newZipFile.addReadStream(f.content, f.path, f.options));
        newZipFile.end(compressOptions);
    });

    originalZipFile.readEntry();

    return newZipFile.outputStream;
}
