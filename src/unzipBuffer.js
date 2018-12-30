import yauzl from 'yauzl';

import promisify from './promisify';

export default promisify(yauzl.fromBuffer);
