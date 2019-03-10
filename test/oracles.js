
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  //const TEST_ORACLES_COUNT = 20;
  let config;
  // Watch contract events
  let tx;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
  });


  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
    let result;

    // ACT
    for (let a=1; a<config.TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
      console.log(`Oracle Registered ${a} indexes: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    // ARRANGE
    //let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    tx = await config.flightSuretyApp.fetchFlightStatus(
          config.airline2, 
          config.web3.utils.asciiToHex(config.flight1Airline2Code), 
          timestamp);
    assert.equal(tx.logs[0].event, 'OracleRequest');
    assert.equal(tx.logs[0].args.airline, config.airline2);
    assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
    assert.equal(tx.logs[0].args.timestamp, timestamp);
    //console.log('Generated random Index when submit request', tx.logs[0].args.index);
    const submitRequestIndex = tx.logs[0].args.index;
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for(let a=1; a<config.TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
      for(let idx=0;idx<3;idx++) {
        try {
          // Submit a response...it will only be accepted if there is an Index match
          tx = await config.flightSuretyApp.submitOracleResponse(
                oracleIndexes[idx], 
                config.airline2, 
                config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                timestamp, 
                config.STATUS_CODE_ON_TIME, 
                { from: accounts[a] });
          assert.equal(tx.logs[0].event, 'OracleReport');
          assert.equal(tx.logs[0].args.airline, config.airline2);
          assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
          assert.equal(tx.logs[0].args.timestamp, timestamp);
          assert.equal(tx.logs[0].args.status, config.STATUS_CODE_ON_TIME);
          console.log(`\nSUCCESS: Oracle number ${a} | index: ${oracleIndexes[idx]}`);
          if (tx.logs[1]) {
            // Check that information has been considered verified. More than 3 oracle respond
            console.log('\nInformation considered verified');
            assert.equal(tx.logs[1].event, 'FlightStatusInfo');
            assert.equal(tx.logs[1].args.airline, config.airline2);
            assert.equal(tx.logs[1].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
            assert.equal(tx.logs[1].args.timestamp, timestamp);
            assert.equal(tx.logs[1].args.status, config.STATUS_CODE_ON_TIME);
          }
        }
        catch(e) {
          // Enable this when debugging
          console.log(`\nIndex Oracle response not match: Oracle number ${a} | index: ${oracleIndexes[idx]} submit request index ${submitRequestIndex} | flight ${config.flight1Airline2Code} | timestamp: ${timestamp}`);
          //console.log(`\nError message: ${e}`);
        }
      }
    }
  });
});
