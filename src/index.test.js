/* global expect, test, beforeAll, afterAll */

import BufferList from 'bl';
import fs from 'fs';
import MockDate from 'mockdate';
import {Readable} from 'stream';

import zipEditor from './index';

const zipFilePath = './testFiles/content.zip';

beforeAll(() => {
    MockDate.set('2019-01-01');
});

afterAll(() => {
    MockDate.reset();
});

test('File not found', () => {
    return expect(zipEditor('./testFiles/notFound.zip')).rejects.toThrow();
});

test('Success - re-Zip', async done => {
    const editor = await zipEditor(zipFilePath);

    editor.pipe(
        new BufferList(function(err, data) {
            expect(data.length).toBe(406);
            expect(data).toMatchSnapshot();
            done();
        })
    );
});

test('Success - re-Zip - filter', async done => {
    const editor = await zipEditor(zipFilePath, {onEntryCallback: ({path}) => path === 'content1.txt'});

    editor.pipe(
        new BufferList(function(err, data) {
            expect(data.length).toBe(150);
            expect(data).toMatchSnapshot();
            done();
        })
    );
});

test('Success - re-Zip - Change Content', async done => {
    const newContent = new Readable();
    newContent.push('content 1-XYZ');
    newContent.push(null);

    const editor = await zipEditor(zipFilePath, {
        onStreamCallback: ({path, content}) => ({content: path === 'content1.txt' ? newContent : content, path}),
    });

    editor.pipe(
        new BufferList(function(err, data) {
            expect(data.length).toBe(409);
            expect(data).toMatchSnapshot();
            done();
        })
    );
});

test('Success - re-Zip - Add new file', async done => {
    const newContent = new Readable();
    newContent.push('content New');
    newContent.push(null);

    const editor = await zipEditor(zipFilePath, {
        onEndCallback: () => [{content: newContent, path: 'content-new.txt'}],
    });

    editor.pipe(
        new BufferList(function(err, data) {
            expect(data.length).toBe(541);
            expect(data).toMatchSnapshot();
            done();
        })
    );
});

test('Error in file content', async done => {
    const zipContent = fs.readFileSync(zipFilePath);
    //
    // Change the first byte in first file content
    zipContent[58] = 'F';

    const onErrorCallback = jest.fn();
    const editor = await zipEditor(zipContent, {onErrorCallback});

    editor.pipe(
        new BufferList(function(err, data) {
            expect(onErrorCallback).toHaveBeenCalledTimes(1);
            expect(onErrorCallback.mock.calls[0][0].path).toBe('content1.txt');
            expect(onErrorCallback.mock.calls[0][0].err).not.toBeNull();
            expect(onErrorCallback.mock.calls[0][0].err).not.toBeUndefined();

            expect(data).toBeUndefined();
            expect(err).not.toBeNull();
            expect(err).not.toBeUndefined();

            done();
        })
    );
});

test('Error in file header', async done => {
    const zipContent = fs.readFileSync(zipFilePath);

    //
    // Change the first byte in first file content
    zipContent[28] = 'F';

    const onErrorCallback = jest.fn();
    const editor = await zipEditor(zipContent, {onErrorCallback});

    editor.pipe(
        new BufferList(function(err, data) {
            expect(onErrorCallback.mock.calls.length).toBe(1);
            expect(onErrorCallback.mock.calls[0][0].path).toBe('content1.txt');
            expect(onErrorCallback.mock.calls[0][0].err).not.toBeNull();
            expect(onErrorCallback.mock.calls[0][0].err).not.toBeUndefined();

            expect(data).toBeUndefined();
            expect(err).not.toBeNull();
            expect(err).not.toBeUndefined();

            done();
        })
    );
});
