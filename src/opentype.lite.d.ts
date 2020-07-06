import {
  FontNames, Table
} from './opentype';

export function parseLite(buffer: any): {
  names: FontNames;
  tables: {
    os2: Table;
  };
};
