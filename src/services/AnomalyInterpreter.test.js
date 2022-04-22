import {isIdToken, LexicoAnalyser, SintacticAnalyser} from "./AnomalyInterpreter";


test('Should validate the Id Token', () => {
  expect(isIdToken("ADF-123")).toBeTruthy();
  expect(isIdToken("asdf adsf a asdf")).toBeFalsy();
  expect(isIdToken("asd-123")).toBeFalsy();
});

const TEXT_EXAMPLE = `BNB-941\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t8.73 AU

DMX-050\tCosmic Anomaly\tCombat Site\tGuristas Hunt Outpost\t100.0%\t8.73 AU
FHJ-520\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t5.44 AU
FOM-167\tCosmic Signature\t\t\t0.0%\t8.12 AU
GCJ-920\tCosmic Anomaly\tCombat Site\tPerimeter Checkpoint\t100.0%\t5.26 AU
HTZ-300\tCosmic Anomaly\tCombat Site\tThe Ruins of Enclave Cohort 27\t100.0%\t5.21 AU
HYW-513\tCosmic Anomaly\tCombat Site\tSleeper Data Sanctuary\t100.0%\t6.40 AU
IXX-302\tCosmic Anomaly\tCombat Site\tSleeper Data Sanctuary\t100.0%\t7.07 AU
JCY-551\tCosmic Signature\tWormhole\tUnstable Wormhole\t100.0%\t7.60 AU
JKU-037\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t4.80 AU
LMR-826\tCosmic Signature\tWormhole\tUnstable Wormhole\t100.0%\t8.34 AU
POM-482\tCosmic Anomaly\tCombat Site\tPerimeter Checkpoint\t100.0%\t7.86 AU
RRX-423\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t5.91 AU
RYN-846\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t4.62 AU
SED-954\tCosmic Signature\tData Site\tUnsecured Perimeter Transponder Farm \t100.0%\t6.74 AU
SZO-744\tCosmic Anomaly\tCombat Site\tThe Ruins of Enclave Cohort 27\t100.0%\t12.76 AU
UNU-208\tCosmic Anomaly\tCombat Site\tPerimeter Checkpoint\t100.0%\t3.62 AU
WNP-100\tCosmic Anomaly\tCombat Site\tPerimeter Checkpoint\t100.0%\t5.38 AU
WWB-066\tCosmic Anomaly\tCombat Site\tSleeper Data Sanctuary\t100.0%\t4.85 AU
XJN-554\tCosmic Signature\tWormhole\tUnstable Wormhole\t100,0%\t5,96 AU
XMI-883\tCosmic Anomaly\tCombat Site\tSleeper Data Sanctuary\t100.0%\t7,54 AU`;

const TEXT_EXAMPLE2 = `DXU-571\tCosmic Signature\tWormhole\tUnstable Wormhole\t100.0%\t14 km\r
BIL-425\tCosmic Anomaly\tCombat Site\tPerimeter Checkpoint\t100.0%\t2.54 AU
CDT-856\tCosmic Anomaly\tOre Site\tUncommon Core Deposit\t100.0%\t6.76 AU
FTJ-448\tCosmic Anomaly\tCombat Site\tPerimeter Hangar\t100.0%\t21.76 AU
RMK-115\tCosmic Anomaly\tOre Site\tIsolated Core Deposit\t100.0%\t27.08 AU`;

test('Should calculate the list of tokens', () => {
  let obj = new SintacticAnalyser(TEXT_EXAMPLE);
  expect(obj.calculateTokens().length).toEqual(144);

  obj = new SintacticAnalyser(TEXT_EXAMPLE2);
  expect(obj.calculateTokens().length).toEqual(34);
});

test('Should calculate the list of anomalies', () => {
  let obj = new LexicoAnalyser(TEXT_EXAMPLE);
  expect(obj.readAnomalies().length).toEqual(21);

  obj = new LexicoAnalyser(TEXT_EXAMPLE2);
  expect(obj.readAnomalies().length).toEqual(5);
});
