import {isIdToken, LexicoAnalyser, SintacticAnalyser} from "./AnomalyInterpreter";
import {removeExtraSpaces} from "./Utils";


test('Should remove extra spaces in the text', () => {
  expect(removeExtraSpaces('   ADF-123   ')).toEqual('ADF-123');
  expect(removeExtraSpaces('asdf   adsf   a        asdf')).toEqual('asdf adsf a asdf');
  expect(removeExtraSpaces('  asd-123\n  ')).toEqual('asd-123');
});
