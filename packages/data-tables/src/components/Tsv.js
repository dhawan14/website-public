import React from 'react';
import { CSVLink } from 'react-csv';
import get from 'lodash/get';

const Tsv = ({ data, id, order, ...otherProps }) => {
  const isTag = (x) => {
    return x.class !== undefined && x.label !== undefined;
  };

  const flattenRecursiveForTsv = (data, prefix = [], result = {}) => {
    if (Object(data) !== data) {
      if (data === null) {
        result[prefix.join('.')] = '';
      } else {
        // check if it contains HTML elements
        if (/<\/?[a-z][\s\S]*>/i.test(data)) {
          // extract content from HTML string on the right side
          result[prefix.join('.')] = data.replace(/<[^>]+>/g, '');
        } else {
          result[prefix.join('.')] = data;
        }
      }
      return result;
    }

    // data: [~]
    if (Array.isArray(data)) {
      // data: [[~],[~],...]
      if (Array.isArray(data[0])) {
        // data: [[],[],...]
        if (data.flat().length === 0) {
          result[prefix.join('.')] = '';
          return result;
        }
        // data: [[{Tag}],[{Tag}],[],[{Tag}],...]
        if (isTag(data.flat()[0])) {
          const tagTypeDataArr = data.map((dat) => {
            if (dat.length === 0) {
              return '';
            }
            return dat.map((da) => {
              return `${da.label}[${da.id}]`;
            });
          });
          result[prefix.join('.')] = tagTypeDataArr.join(';');
          return result;
        }

        console.error(data);
        throw new Error(
          'Data is surely array of array. But it is not Tag type one.'
        );
      }

      // data: [{~},{~},...]
      if (typeof data[0] === 'object') {
        // data: [{Tag},{Tag},...]
        if (isTag(data[0])) {
          const tagTypeDataArr = data.map((dat) => `${dat.label}[${dat.id}]`);
          result[prefix.join('.')] = tagTypeDataArr.join(';');
          return result;
        }

        // data: [{Pato},{Pato},...]
        if (data[0].pato_evidence) {
          const patoTypeDataArr = data.map(
            (dat) =>
              `${dat.pato_evidence.entity_term.label}[${dat.pato_evidence.entity_term.id}] ${dat.pato_evidence.pato_term}`
          );
          result['entity'] = patoTypeDataArr.join(';');
          return result;
        }

        console.error(data);
        throw new Error(
          'Data is surely array of object. But it is neigher Tag type one nor Pato type one.'
        );
      }

      // data: [~,~,...]
      result[prefix.join('.')] = data.join(';');
      return result;
    }

    // data: {Tag}
    if (isTag(data)) {
      result[prefix.join('.')] = `${data.label}[${data.id}]`;
      return result;
    }

    // data: {Species}
    if (data.species !== undefined && data.genus !== undefined) {
      result['species'] = `${data.genus}. ${data.species}`;
      return result;
    }

    Object.keys(data).forEach((key) => {
      flattenRecursiveForTsv(data[key], [...prefix, key], result);
    });
    return result;
  };

  const flattenedData = data.map((dat) => flattenRecursiveForTsv(dat));

  const uniqueKeys = Object.keys(
    flattenedData.reduce((result, obj) => {
      return Object.assign(result, obj);
    }, {})
  );

  const uniqueKeysSortedByColumnOrder = order.map((ord) => {
    const filterFunc = (fi) => {
      const regex = new RegExp(`^${ord}\\..+`);
      if (fi === ord || regex.test(fi)) {
        return true;
      }
      return false;
    };

    return uniqueKeys.filter((u) => filterFunc(u)).sort();
  });

  const sortByKey = (array, key) => {
    const checkAndModify = (data) => {
      if (data === undefined) {
        return null;
      }
      if (!isNaN(Number(data))) {
        return Number(data);
      }
      return data.toLowerCase();
    };

    return array.sort((a, b) => {
      const ax = checkAndModify(get(a, key));
      const bx = checkAndModify(get(b, key));
      return ax === bx ? 0 : ax > bx ? 1 : -1;
    });
  };

  const getKeyUsedByDefaultColumnSort = (keys) => {
    if (keys[0].length === 1) {
      return keys[0];
    }

    const regex = new RegExp(`.+\\.text$`);
    const found = keys[0].find((k) => regex.test(k));
    if (found) {
      return found;
    }

    console.error(keys);
    throw new Error(
      'It is not possible to determine which key in the data is used for the default sorting'
    );
  };

  return (
    <CSVLink
      data={sortByKey(
        flattenedData,
        getKeyUsedByDefaultColumnSort(uniqueKeysSortedByColumnOrder)
      )}
      headers={uniqueKeysSortedByColumnOrder.flat()}
      separator={','}
      filename={`${id}.csv`}
      {...otherProps}
    >
      Download CSV
    </CSVLink>
  );
};

export default Tsv;