// opentype.js
// https://github.com/opentypejs/opentype.js
// (c) 2015 Frederik De Bleser
// opentype.js may be freely distributed under the MIT license.

/* global DataView, Uint8Array, XMLHttpRequest  */

import parse from './parse';
import ltag from './tables/ltag';
import _name from './tables/name';
import os2 from './tables/os2';

// Table Directory Entries //////////////////////////////////////////////
/**
 * Parses OpenType table entries.
 * @param  {DataView}
 * @param  {Number}
 * @return {Object[]}
 */
function parseOpenTypeTableEntries(data, numTables) {
    const tableEntries = [];
    let p = 12;
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const checksum = parse.getULong(data, p + 4);
        const offset = parse.getULong(data, p + 8);
        const length = parse.getULong(data, p + 12);
        tableEntries.push({tag: tag, checksum: checksum, offset: offset, length: length, compression: false});
        p += 16;
    }

    return tableEntries;
}

/**
 * @param  {DataView}
 * @param  {Object}
 * @return {TableData}
 */
function uncompressTable(data, tableEntry) {
    // if (tableEntry.compression === 'WOFF') {
    //     const inBuffer = new Uint8Array(data.buffer, tableEntry.offset + 2, tableEntry.compressedLength - 2);
    //     const outBuffer = new Uint8Array(tableEntry.length);
    //     inflate(inBuffer, outBuffer);
    //     if (outBuffer.byteLength !== tableEntry.length) {
    //         throw new Error('Decompression error: ' + tableEntry.tag + ' decompressed length doesn\'t match recorded length');
    //     }

    //     const view = new DataView(outBuffer.buffer, 0);
    //     return {data: view, offset: 0};
    // } else {
        return { data: data, offset: tableEntry.offset };
    // }
}

// Public API ///////////////////////////////////////////////////////////

function _parseBufferHead(data, font) {
    let numTables;
    let tableEntries = [];
    const signature = parse.getTag(data, 0);
    if (signature === String.fromCharCode(0, 1, 0, 0) || signature === 'true' || signature === 'typ1') {
        font.outlinesFormat = 'truetype';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'OTTO') {
        font.outlinesFormat = 'cff';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else {
        throw new Error('Unsupported OpenType signature ' + signature);
    }
    return [
        numTables, tableEntries
    ];
}

/**
 * Parse the OpenType file data (as an ArrayBuffer) and return a Font object.
 * Throws an error if the font could not be parsed.
 * @param  {ArrayBuffer}
 * @return {opentype.Font} Font with only names and os2 table.
 */
function parseBufferLite(buffer) {
    const font = { empty: true, tables: {} };
    const data = new DataView(buffer, 0);
    const [
        numTables, tableEntries
    ] = _parseBufferHead(data, font);

    let nameTableEntry;
    let ltagTable;

    for (let i = 0; i < numTables; i += 1) {
        const tableEntry = tableEntries[i];
        let table;
        switch (tableEntry.tag) {
            case 'name':
                nameTableEntry = tableEntry;
                break;
            case 'OS/2':
                table = uncompressTable(data, tableEntry);
                font.tables.os2 = os2.parse(table.data, table.offset);
                break;
            case 'ltag':
                table = uncompressTable(data, tableEntry);
                ltagTable = ltag.parse(table.data, table.offset);
                break;
        }
    }
    const nameTable = uncompressTable(data, nameTableEntry);
    font.tables.name = _name.parse(nameTable.data, nameTable.offset, ltagTable);
    font.names = font.tables.name;
    return font;
}
export {
    parseBufferLite as parseLite,
};