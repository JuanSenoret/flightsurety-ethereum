
const Test = require('../config/testConfig.js');
const BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  let config;
  let timestamp;
  let resultBuffer;
  let submitRequestIndex;
  console.log("ganache accounts used here...");
  console.log("Contract Owner: accounts[0] ", accounts[0]);

  describe('Check ownable functions', () => {
    beforeEach(async () => { 
        config = await Test.Config(accounts);
    });

    it('Contract Owner is correct', async () => {
        assert.equal(await config.flightSuretyApp.isOwner({from: config.owner}), true);
        assert.equal(await config.flightSuretyData.isOwner({from: config.owner}), true);
    });

    it('Contract Owner is not correct', async () => {
        assert.equal(await config.flightSuretyApp.isOwner({from: config.fakeOwner}), false);
        assert.equal(await config.flightSuretyData.isOwner({from: config.fakeOwner}), false);
    });

    it('Only contract owner can transfer ownership', async () => {
        // fakeOwnerID try to transfer the ownership to newOwnerID but it is no possible
        await expectThrow(config.flightSuretyApp.transferOwnership(config.owner, {from: config.fakeOwner}));
        await expectThrow(config.flightSuretyData.transferOwnership(config.owner, {from: config.fakeOwner}));
    });

    it('Contract owner transfers ownership new owner account', async () => {
        // ownerID transfer the ownership to newOwnerID SuretyApp contract
        tx = await config.flightSuretyApp.transferOwnership(config.newOwner, {from: config.owner});
        assert.equal(tx.logs[0].event, 'TransferOwnership');
        assert.equal(tx.logs[0].args.oldOwner, config.owner);
        assert.equal(tx.logs[0].args.newOwner, config.newOwner);
        assert.equal(await config.flightSuretyApp.isOwner({from: config.newOwner}), true);

         // ownerID transfer the ownership to newOwnerID SuretyData contract
        tx = await config.flightSuretyData.transferOwnership(config.newOwner, {from: config.owner});
        assert.equal(tx.logs[0].event, 'TransferOwnership');
        assert.equal(tx.logs[0].args.oldOwner, config.owner);
        assert.equal(tx.logs[0].args.newOwner, config.newOwner);
        assert.equal(await config.flightSuretyData.isOwner({from: config.newOwner}), true);
    });

    it('Renunce contract ownership', async () => {
        // SuretyApp Contract
        tx = await config.flightSuretyApp.renounceOwnership({from: config.owner});
        assert.equal(tx.logs[0].event, 'TransferOwnership');
        assert.equal(tx.logs[0].args.oldOwner, config.owner);
        assert.equal(tx.logs[0].args.newOwner, config.emptyAddress);

        // SuretyData Contract
        tx = await config.flightSuretyData.renounceOwnership({from: config.owner});
        assert.equal(tx.logs[0].event, 'TransferOwnership');
        assert.equal(tx.logs[0].args.oldOwner, config.owner);
        assert.equal(tx.logs[0].args.newOwner, config.emptyAddress);
    });

  });

  describe('Check utility functions in flightSuretyData contract', () => {
    before('setup contract', async () => { 
        config = await Test.Config(accounts);
    });

    it('Authorize the flightSuretyApp contrat address to be a caller of flightSuretyData contract', async () => {
        tx = await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        assert.equal(tx.logs[0].event, 'AuthorizeContractCaller');
        assert.equal(tx.logs[0].args.authorizedCaller, config.flightSuretyApp.address);
    });

    it('Deauthorize the flightSuretyApp contrat address to be a caller of flightSuretyData contract', async () => {
        tx = await config.flightSuretyData.deauthorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        assert.equal(tx.logs[0].event, 'DeauthorizeContractCaller');
        assert.equal(tx.logs[0].args.deauthorizedCaller, config.flightSuretyApp.address);
    });

    it('Check that only contract owner can authorize the flightSuretyApp contrat address to be a caller of flightSuretyData contract', async () => {
        await expectThrow(config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.fakeOwner}));
    });

    it('Data contract has correct initial isOperational() value', async () => {
        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");
    });

    it('Data contract can block access to setOperatingStatus() for non-Contract Owner account', async () => {
        // Get operating status
        await expectThrow(config.flightSuretyData.setOperatingStatus(false, {from: config.fakeOwner}));
    });

    it(`Data contract can allow access to setOperatingStatus() for Contract Owner account`, async () => {
        // Set operational status to false
        tx = await config.flightSuretyData.setOperatingStatus(false, {from: config.owner});
        assert.equal(tx.logs[0].event, 'OperatingStatusUpdated');
        assert.equal(tx.logs[0].args.operationalStatus, false);

        // Set operational status to false again and an exception will happen because the value es the same as previously
        await expectThrow(config.flightSuretyData.setOperatingStatus(false, {from: config.owner}));
        // Set operational status to true again to proceed with following tests
        await config.flightSuretyData.setOperatingStatus(true, {from: config.owner});
    });

    it(`Data contract can fetch the current configuration values`, async () => {
        // Authorize flightSuretyApp address to call flightSuretyData contract
        await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        // Fetch the configuration values
        resultBuffer = await config.flightSuretyApp.fetchDataContractConfiguration.call();
        // Check the result buffer
        assert.equal(resultBuffer[0], config.initOperational, 'Error: Invalid operational value');
        assert.equal(resultBuffer[1], config.initMinAirlinesNumberMutipartyConsensus, 'Error: Invalid minAirlinesNumberMutipartyConsensus value');
        assert.equal(resultBuffer[2], config.initMinSubmitionFund, 'Error: Invalid minSubmitionFund value');
        assert.equal(resultBuffer[3], 1, 'Error: Invalid number of registered airlines value');
    });

    it(`Data contract can set MinAirlinesNumberMutipartyConsensus parameter`, async () => {
        // Fetch the configuration values
        tx = await config.flightSuretyData.setMinAirlinesNumberMutipartyConsensus(10, {from: config.owner});
        // Check the result
        assert.equal(tx.logs[0].event, 'MinAirlinesNumberMutipartyConsensusUpdated');
        assert.equal(tx.logs[0].args.newValue, 10);
    });

    it(`Data contract can set MinSubmitionFund parameter`, async () => {
        // Fetch the configuration values
        tx = await config.flightSuretyData.setMinSubmitionFund(config.newMinSubmitionFund, {from: config.owner});
        // Check the result
        assert.equal(tx.logs[0].event, 'MinSubmitionFundUpdated');
        assert.equal(tx.logs[0].args.newValue, config.newMinSubmitionFund);
    });

  });

  describe('Check functions to register airlines in flightSuretyData contract', () => {

    before('setup contract', async () => { 
        config = await Test.Config(accounts);
        // Authorize flightSuretyApp address to call flightSuretyData contract
        await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
    });

    it(`Register an Airline using registerAirline() function`, async () => {
        // The contract owner is the genesis airline when the contract is deployed
        tx = await config.flightSuretyApp.registerAirline(config.airline2, config.airline2Name, {from: config.airline1});
        assert.equal(tx.logs[0].event, 'AirlineRegistration');
        assert.equal(tx.logs[0].args.state, 1);
        assert.equal(tx.logs[0].args.airlinesRegistered, 2);
    });

    it(`Check an airline already registered submit fund`, async () => {
        // The contract owner is the genesis airline when the contract is deployed
        tx = await config.flightSuretyApp.submitFundAirline({from: config.airline2, value: config.initMinSubmitionFund});
        assert.equal(tx.logs[0].event, 'AirlineSubmittedFund');
        assert.equal(tx.logs[0].args.airlineAdress, config.airline2);
        assert.equal(tx.logs[0].args.fund, config.initMinSubmitionFund);
        // Check the contract balance
        resultBuffer = await config.flightSuretyApp.getBalanceAppContract.call({from: config.owner});
        assert.equal(
            config.web3.utils.fromWei(resultBuffer, "ether"), 
            config.web3.utils.fromWei(config.initMinSubmitionFund, "ether"), 
            'Error: Invalid contract balance'
        );
    });

    it(`Check multiparty voting consensus to register the fifth airline`, async () => {
        // Register third airline and submit fund
        tx = await config.flightSuretyApp.registerAirline(config.airline3, config.airline3Name, {from: config.airline1});
        assert.equal(tx.logs[0].event, 'AirlineRegistration');
        assert.equal(tx.logs[0].args.state, 1);
        await config.flightSuretyApp.submitFundAirline({from: config.airline3, value: config.initMinSubmitionFund});
        // Register forth airline and submit fund
        tx = await config.flightSuretyApp.registerAirline(config.airline4, config.airline4Name, {from: config.airline1});
        assert.equal(tx.logs[0].event, 'AirlineRegistration');
        assert.equal(tx.logs[0].args.state, 1);
        await config.flightSuretyApp.submitFundAirline({from: config.airline4, value: config.initMinSubmitionFund});
        // Register fifth airline. Multiparty consesus shall start
        tx = await config.flightSuretyApp.registerAirline(config.airline5, config.airline5Name, {from: config.airline1});
        assert.equal(tx.logs[0].event, 'AirlineRegistration');
        assert.equal(tx.logs[0].args.state, 0);
        // Check that airline 5 can not submit found because the fifth airline need to be voted for the others airlines to start to operate
        await expectThrow(config.flightSuretyApp.submitFundAirline({from: config.airline5, value: config.initMinSubmitionFund}));

        // Check the contract balance
        resultBuffer = await config.flightSuretyApp.getBalanceAppContract.call({from: config.owner});
        assert.equal(
            config.web3.utils.fromWei(resultBuffer, "ether"), 
            config.web3.utils.fromWei((3*config.initMinSubmitionFund).toString(), "ether"), 
            'Error: Invalid contract balance'
        );

        // Airline1 vote possitive to register fifth airline
        tx = await config.flightSuretyApp.multipartyConsensusVote(config.airline5, true, {from: config.airline1});
        assert.equal(tx.logs[0].event, 'MultipartyConsensusAirlineRegisterVote');
        assert.equal(tx.logs[0].args.airlineEmitionVoteAddress, config.airline1);
        assert.equal(tx.logs[0].args.airlineVotedName, config.airline5Name);
        assert.equal(tx.logs[0].args.airlineVotes, 1);

        // Airline2 vote possitive to register fifth airline
        tx = await config.flightSuretyApp.multipartyConsensusVote(config.airline5, true, {from: config.airline2});
        assert.equal(tx.logs[0].event, 'MultipartyConsensusAirlineRegisterVote');
        assert.equal(tx.logs[0].args.airlineEmitionVoteAddress, config.airline2);
        assert.equal(tx.logs[0].args.airlineVotedName, config.airline5Name);
        assert.equal(tx.logs[0].args.airlineVotes, 2);

        // Now fifth airline can submit its fund
        await config.flightSuretyApp.submitFundAirline({from: config.airline5, value: config.initMinSubmitionFund});
        // Check the contract balance. Now 4 ether shall be the contract balance
        resultBuffer = await config.flightSuretyApp.getBalanceAppContract.call({from: config.owner});
        assert.equal(
            config.web3.utils.fromWei(resultBuffer, "ether"), 
            config.web3.utils.fromWei((4*config.initMinSubmitionFund).toString(), "ether"), 
            'Error: Invalid contract balance'
        );
    });
  });
  
  describe('Check functions to register flights in flightSuretyData contract', () => {

    before('setup contract', async () => { 
        config = await Test.Config(accounts);
        // Authorize flightSuretyApp address to call flightSuretyData contract
        await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        // Register a second airline
        await config.flightSuretyApp.registerAirline(config.airline2, config.airline2Name, {from: config.airline1});
        // Submit fund for the second airline in order to start to operate
        await config.flightSuretyApp.submitFundAirline({from: config.airline2, value: config.initMinSubmitionFund});
        // Register a third airline
        await config.flightSuretyApp.registerAirline(config.airline3, config.airline3Name, {from: config.airline1});
        // Submit fund for the second airline in order to start to operate
        await config.flightSuretyApp.submitFundAirline({from: config.airline3, value: config.initMinSubmitionFund});
    });

    it(`Register several flights for both airlines`, async () => {
        timestamp = Math.floor(Date.now() / 1000);
        // Register first flight for airline2
        tx = await config.flightSuretyApp.registerFlight(
                config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                timestamp,
                config.web3.utils.asciiToHex(config.flight1Airline2CodeDeparture),
                config.web3.utils.asciiToHex(config.flight1Airline2CodeArrival),
                {from: config.airline2});
        assert.equal(tx.logs[0].event, 'FlightRegistered');
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight1Airline2Code));
        assert.equal(tx.logs[0].args.airline, config.airline2);
        assert.equal(tx.logs[0].args.status, config.STATUS_CODE_UNKNOWN);
        // Register second flight for airline2
        tx = await config.flightSuretyApp.registerFlight(
                config.web3.utils.asciiToHex(config.flight2Airline2Code), 
                timestamp,
                config.web3.utils.asciiToHex(config.flight2Airline2CodeDeparture),
                config.web3.utils.asciiToHex(config.flight2Airline2CodeArrival),
                {from: config.airline2});
        assert.equal(tx.logs[0].event, 'FlightRegistered');
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight2Airline2Code));
        assert.equal(tx.logs[0].args.airline, config.airline2);
        assert.equal(tx.logs[0].args.status, config.STATUS_CODE_UNKNOWN);
        // Register first flight for airline3
        tx = await config.flightSuretyApp.registerFlight(
                config.web3.utils.asciiToHex(config.flight1Airline3Code), 
                timestamp,
                config.web3.utils.asciiToHex(config.flight1Airline3CodeDeparture),
                config.web3.utils.asciiToHex(config.flight1Airline3CodeArrival),
                {from: config.airline3});
        assert.equal(tx.logs[0].event, 'FlightRegistered');
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight1Airline3Code));
        assert.equal(tx.logs[0].args.airline, config.airline3);
        assert.equal(tx.logs[0].args.status, config.STATUS_CODE_UNKNOWN);
        // Register second flight for airline3
        tx = await config.flightSuretyApp.registerFlight(
                config.web3.utils.asciiToHex(config.flight2Airline3Code), 
                timestamp,
                config.web3.utils.asciiToHex(config.flight2Airline3CodeDeparture),
                config.web3.utils.asciiToHex(config.flight2Airline3CodeArrival),
                {from: config.airline3});
        assert.equal(tx.logs[0].event, 'FlightRegistered');
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight2Airline3Code));
        assert.equal(tx.logs[0].args.airline, config.airline3);
        assert.equal(tx.logs[0].args.status, config.STATUS_CODE_UNKNOWN);
    });

    it(`Try to register a second time the same flight for airline1 and get exception`, async () => {
        timestamp = Math.floor(Date.now() / 1000);
        await expectThrow(config.flightSuretyApp.registerFlight(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            timestamp,
            config.web3.utils.asciiToHex(config.flight1Airline2CodeDeparture),
            config.web3.utils.asciiToHex(config.flight1Airline2CodeArrival),
            {from: config.airline2}));
    });

    it(`Fetch registered flights codes`, async () => {
        resultBuffer = await config.flightSuretyApp.fetchFlightsCodes.call({from: config.owner});
        assert.equal(config.web3.utils.toUtf8(resultBuffer[0]), config.flight1Airline2Code);
        assert.equal(config.web3.utils.toUtf8(resultBuffer[1]), config.flight2Airline2Code);
        assert.equal(config.web3.utils.toUtf8(resultBuffer[2]), config.flight1Airline3Code);
        assert.equal(config.web3.utils.toUtf8(resultBuffer[3]), config.flight2Airline3Code);
    });

    it(`Fetch info for a specific registered flight`, async () => {
        const resultBufferFlightInfo = await config.flightSuretyApp.fetchFlightInfoByCode.call(resultBuffer[0], {from: config.owner});
        assert.equal(config.web3.utils.toUtf8(resultBufferFlightInfo[0]), config.flight1Airline2Code);
        assert.equal(resultBufferFlightInfo[1], config.airline2Name);
        assert.equal(config.web3.utils.toUtf8(resultBufferFlightInfo[2]), config.flight1Airline2CodeDeparture);
        assert.equal(config.web3.utils.toUtf8(resultBufferFlightInfo[3]), config.flight1Airline2CodeArrival);
    });
  });

  describe('Check passenger functions to buy insurance', () => {

    before('setup contract', async () => {
        timestamp = Math.floor(Date.now() / 1000);
        config = await Test.Config(accounts);
        // Authorize flightSuretyApp address to call flightSuretyData contract
        await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        // Register a second airline
        await config.flightSuretyApp.registerAirline(config.airline2, config.airline2Name, {from: config.airline1});
        // Submit fund for the second airline in order to start to operate
        await config.flightSuretyApp.submitFundAirline({from: config.airline2, value: config.initMinSubmitionFund});
        timestamp = Math.floor(Date.now() / 1000);
        // Register first flight for airline2
        await config.flightSuretyApp.registerFlight(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            timestamp,
            config.web3.utils.asciiToHex(config.flight1Airline2CodeDeparture),
            config.web3.utils.asciiToHex(config.flight1Airline2CodeArrival),
            {from: config.airline2});
    });

    it(`Passenger try to buy an insurace for a not existing flight. Exception shall happen`, async () => {
        await expectThrow(config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight2Airline2Code), 
            {from: config.passenger1, value: config.insurancePaidNotEnough}))
    });

    it(`Passenger try to buy an insurace but paid is not enough. Exception shall happen`, async () => {
        await expectThrow(config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            {from: config.passenger1, value: config.insurancePaidNotEnough}))
    });

    it(`Passenger buy an insurace for an existing flight`, async () => {
        // Passenger1 buy a insurance for the flight flight1Airline2Code
        tx = await config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            {from: config.passenger1, value: config.insurancePaidEnough});
        assert.equal(tx.logs[0].event, 'BoughtInsurance');
        assert.equal(tx.logs[0].args.passenger, config.passenger1);
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight1Airline2Code));
        assert.equal(tx.logs[0].args.status, 0);
    });

    it(`Passenger try to buy an insurace for the same flight but the prev insurance is not jet solved. Exception shall happen`, async () => {
        await expectThrow(config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            {from: config.passenger1, value: config.insurancePaidEnough}))
    });

    it(`Fetch insurances keys for a passenger who doesnt exist in the database. Exception shall happen`, async () => {
        await expectThrow(config.flightSuretyApp.fetchActiveInsurancesKeysForPassenger.call({from: config.passenger2}));
    });

    it(`Fetch insurances keys for a passenger who already bought a insurance`, async () => {
        resultBuffer = await config.flightSuretyApp.fetchActiveInsurancesKeysForPassenger.call({from: config.passenger1});
        assert.equal(config.web3.utils.toUtf8(resultBuffer[0]), config.flight1Airline2Code);
    });

    it(`Try to fetch insurances data for a passenger who didnt bought an insurance. Exception shall happen`, async () => {
        await expectThrow(config.flightSuretyApp.fetchInsurancesInfoForPassengerAndCode.call(
            config.web3.utils.asciiToHex(config.flight2Airline2Code), 
            {from: config.passenger1}));
    });

    it(`Fetch insurances data for a passenger who already bought an insurance`, async () => {
        const resultBufferInsuranceInfo = await config.flightSuretyApp.fetchInsurancesInfoForPassengerAndCode.call(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            {from: config.passenger1});
        assert.equal(config.web3.utils.toUtf8(resultBufferInsuranceInfo[0]), config.flight1Airline2Code);
        assert.equal(resultBufferInsuranceInfo[1], config.insurancePaidEnough);
        assert.equal(resultBufferInsuranceInfo[2], 0);
    });
  });

  describe('Check complete workflow from buying an insurance, through oracles submit response and passenger withdraw payout', () => {
    before('setup contract', async () => {
        const fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
        config = await Test.Config(accounts);
        // Authorize flightSuretyApp address to call flightSuretyData contract
        await config.flightSuretyData.authorizeContractCaller(config.flightSuretyApp.address, {from: config.owner});
        // Register a second airline
        await config.flightSuretyApp.registerAirline(config.airline2, config.airline2Name, {from: config.airline1});
        // Submit fund for the second airline in order to start to operate
        await config.flightSuretyApp.submitFundAirline({from: config.airline2, value: config.initMinSubmitionFund});
        timestamp = Math.floor(Date.now() / 1000);
        // Register first flight for airline2
        await config.flightSuretyApp.registerFlight(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            timestamp,
            config.web3.utils.asciiToHex(config.flight1Airline2CodeDeparture),
            config.web3.utils.asciiToHex(config.flight1Airline2CodeArrival),
            {from: config.airline2});
        // Register second flight for airline2
        await config.flightSuretyApp.registerFlight(
            config.web3.utils.asciiToHex(config.flight2Airline2Code), 
            timestamp,
            config.web3.utils.asciiToHex(config.flight2Airline2CodeDeparture),
            config.web3.utils.asciiToHex(config.flight2Airline2CodeArrival),
            {from: config.airline2});
        // Register oracles
        console.log('Oracles registraion');
        for (let a=1; a<config.TEST_ORACLES_COUNT; a++) {
            await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
            result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
            console.log(`Oracle Registered ${a} indexes: ${result[0]}, ${result[1]}, ${result[2]}`);
        }
    });

    it(`Passenger1 buy an insurace for first existing flight`, async () => {
        // Passenger1 buy a insurance for the flight flight1Airline2Code
        tx = await config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight1Airline2Code), 
            {from: config.passenger1, value: config.insurancePaidEnough});
        assert.equal(tx.logs[0].event, 'BoughtInsurance');
        assert.equal(tx.logs[0].args.passenger, config.passenger1);
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight1Airline2Code));
        assert.equal(tx.logs[0].args.status, 0);
    });

    it(`Passenger2 buy an insurace for the second existing flight`, async () => {
        // Passenger1 buy a insurance for the flight flight1Airline2Code
        tx = await config.flightSuretyApp.buyInsurance(
            config.web3.utils.asciiToHex(config.flight2Airline2Code), 
            {from: config.passenger2, value: config.insurancePaidEnough});
        assert.equal(tx.logs[0].event, 'BoughtInsurance');
        assert.equal(tx.logs[0].args.passenger, config.passenger2);
        assert.equal(tx.logs[0].args.flightCode, config.web3.utils.asciiToHex(config.flight2Airline2Code));
        assert.equal(tx.logs[0].args.status, 0);
    });

    it(`Submit a request for oracles to get status information for the first flight`, async () => {
        timestamp = Math.floor(Date.now() / 1000);
        // Submit a request for oracles to get status information for a flight
        tx = await config.flightSuretyApp.fetchFlightStatus(
                config.airline2, 
                config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                timestamp);
        assert.equal(tx.logs[0].event, 'OracleRequest');
        assert.equal(tx.logs[0].args.airline, config.airline2);
        assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
        assert.equal(tx.logs[0].args.timestamp, timestamp);
        submitRequestIndex = tx.logs[0].args.index;
    });

    it(`Submit a response from oracles for the first flight. It will only be accepted if there is an Index match. Status: STATUS_CODE_LATE_AIRLINE `, async () => {
        for(let a=1; a<config.TEST_ORACLES_COUNT; a++) {

            // Get oracle information
            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
            const statusCode = config.STATUS_CODE_LATE_AIRLINE;
            for(let idx=0;idx<3;idx++) {
              try {
                // Submit a response...it will only be accepted if there is an Index match
                tx = await config.flightSuretyApp.submitOracleResponse(
                        oracleIndexes[idx], 
                        config.airline2, 
                        config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                        timestamp, 
                        statusCode, 
                        { from: accounts[a] });
                assert.equal(tx.logs[0].event, 'OracleReport');
                assert.equal(tx.logs[0].args.airline, config.airline2);
                assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
                assert.equal(tx.logs[0].args.timestamp, timestamp);
                assert.equal(tx.logs[0].args.status, statusCode);
                console.log(`\nSUCCESS: Oracle number ${a} | index: ${oracleIndexes[idx]}`);
                if (tx.logs[1]) {
                  // Check that information has been considered verified. More than 3 oracle respond
                  console.log('\nInformation considered verified');
                  assert.equal(tx.logs[1].event, 'FlightStatusInfo');
                  assert.equal(tx.logs[1].args.airline, config.airline2);
                  assert.equal(tx.logs[1].args.flight, config.web3.utils.asciiToHex(config.flight1Airline2Code));
                  assert.equal(tx.logs[1].args.timestamp, timestamp);
                  assert.equal(tx.logs[1].args.status, statusCode);
                }
              }
              catch(e) {
                // Enable this when debugging
                //console.log(`\nIndex Oracle response not match: Oracle number ${a} | index: ${oracleIndexes[idx]} submit request index ${submitRequestIndex} | flight ${config.flight1Airline2Code} | timestamp: ${timestamp}`);
                //console.log(`\nError message: ${e}`);
              }
            }
        }
    });

    it(`Fetch insurances data for a passenger1 who already bought an insurance and check the status changed to ready for payout`, async () => {
        try {
            const resultBufferInsuranceInfo = await config.flightSuretyApp.fetchInsurancesInfoForPassengerAndCode.call(
                config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                {from: config.passenger1});
            assert.equal(config.web3.utils.toUtf8(resultBufferInsuranceInfo[0]), config.flight1Airline2Code);
            assert.equal(resultBufferInsuranceInfo[1], config.insurancePaidEnough);
            assert.equal(resultBufferInsuranceInfo[2], 1);

        } catch (error) {
            console.log('Not enough oracles submitted the response for the generated random index. Error: ' + error);
        }
    });

    it(`Passenger call withdraw function to get paid`, async () => {
        // Try to catch the error in case not enough oracles submitted the response for the generated random index
        try {
            tx = await config.flightSuretyApp.passengerWithdraw(
                config.web3.utils.asciiToHex(config.flight1Airline2Code), 
                {from: config.passenger1});
            assert.equal(tx.logs[0].event, 'PassengerWithdrawStatus');
            assert.equal(tx.logs[0].args.passenger, config.passenger1);
            assert.equal(tx.logs[0].args.code, config.web3.utils.asciiToHex(config.flight1Airline2Code));
            assert.equal(
                config.web3.utils.fromWei(tx.logs[0].args.amount, 'ether'), 
                config.web3.utils.fromWei(config.insuranceWithdraw, 'ether'));
            assert.equal(tx.logs[0].args.status, 2);
        } catch (error) {
            console.log('Not enough oracles submitted the response for the generated random index. Error: ' + error);
        }
    });

    it(`Submit a request for oracles to get status information for the second flight`, async () => {
        timestamp = Math.floor(Date.now() / 1000);
        // Submit a request for oracles to get status information for a flight
        tx = await config.flightSuretyApp.fetchFlightStatus(
                config.airline2, 
                config.web3.utils.asciiToHex(config.flight2Airline2Code), 
                timestamp);
        assert.equal(tx.logs[0].event, 'OracleRequest');
        assert.equal(tx.logs[0].args.airline, config.airline2);
        assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight2Airline2Code));
        assert.equal(tx.logs[0].args.timestamp, timestamp);
        submitRequestIndex = tx.logs[0].args.index;
    });

    it(`Submit a response from oracles for the second flight. It will only be accepted if there is an Index match. Status: STATUS_CODE_LATE_WEATHER `, async () => {
        for(let a=1; a<config.TEST_ORACLES_COUNT; a++) {
            // Get oracle information
            let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
            const statusCode = config.STATUS_CODE_LATE_WEATHER;
            for(let idx=0;idx<3;idx++) {
              try {
                // Submit a response...it will only be accepted if there is an Index match
                tx = await config.flightSuretyApp.submitOracleResponse(
                        oracleIndexes[idx], 
                        config.airline2, 
                        config.web3.utils.asciiToHex(config.flight2Airline2Code), 
                        timestamp, 
                        statusCode, 
                        { from: accounts[a] });
                assert.equal(tx.logs[0].event, 'OracleReport');
                assert.equal(tx.logs[0].args.airline, config.airline2);
                assert.equal(tx.logs[0].args.flight, config.web3.utils.asciiToHex(config.flight2Airline2Code));
                assert.equal(tx.logs[0].args.timestamp, timestamp);
                assert.equal(tx.logs[0].args.status, statusCode);
                console.log(`\nSUCCESS: Oracle number ${a} | index: ${oracleIndexes[idx]}`);
                if (tx.logs[1]) {
                  // Check that information has been considered verified. More than 3 oracle respond
                  console.log('\nInformation considered verified');
                  assert.equal(tx.logs[1].event, 'FlightStatusInfo');
                  assert.equal(tx.logs[1].args.airline, config.airline2);
                  assert.equal(tx.logs[1].args.flight, config.web3.utils.asciiToHex(config.flight2Airline2Code));
                  assert.equal(tx.logs[1].args.timestamp, timestamp);
                  assert.equal(tx.logs[1].args.status, statusCode);
                }
              }
              catch(e) {
                // Enable this when debugging
                //console.log(`\nIndex Oracle response not match: Oracle number ${a} | index: ${oracleIndexes[idx]} submit request index ${submitRequestIndex} | flight ${config.flight1Airline2Code} | timestamp: ${timestamp}`);
                //console.log(`\nError message: ${e}`);
              }
            }
        }
    });

    it(`Fetch insurances data for a passenger2 who already bought an insurance and check the status changed to expired because delay caused by weather conditions`, async () => {
        try {
            const resultBufferInsuranceInfo = await config.flightSuretyApp.fetchInsurancesInfoForPassengerAndCode.call(
                config.web3.utils.asciiToHex(config.flight2Airline2Code), 
                {from: config.passenger2});
            assert.equal(config.web3.utils.toUtf8(resultBufferInsuranceInfo[0]), config.flight2Airline2Code);
            assert.equal(resultBufferInsuranceInfo[1], config.insurancePaidEnough);
            assert.equal(resultBufferInsuranceInfo[2], 3);

        } catch (error) {
            console.log('Not enough oracles submitted the response for the generated random index. Error: ' + error);
        }
    });
  });
});

const expectThrow = async (promise) => {
    try {
        await promise;
    } catch (error) {
        assert.exists(error);
        return;
    }

    assert.fail('Expected an error but didnt see one!');
};
