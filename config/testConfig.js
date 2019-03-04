
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    /*let testAddresses = [
        "0x69e1CB5cFcA8A311586e3406ed0301C06fb839a2",
        "0xF014343BDFFbED8660A9d8721deC985126f189F3",
        "0x0E79EDbD6A727CfeE09A2b1d0A59F7752d5bf7C9",
        "0x9bC1169Ca09555bf2721A5C9eC6D69c8073bfeB4",
        "0xa23eAEf02F9E0338EEcDa8Fdd0A73aDD781b2A86",
        "0x6b85cc8f612d5457d49775439335f83e12b8cfde",
        "0xcbd22ff1ded1423fbc24a7af2148745878800024",
        "0xc257274276a4e539741ca11b590b9447b26a8051",
        "0x2f2899d6d35b1a48a4fbdc93a37a72f264a9fca7"
    ];*/
    let testAddresses = [
        "0xa0364ad44abF70977d51270c5EFe623019f7f310",
        "0xAa3135FD8e2C7A745C16be7Fd7d643369D671c1F",
        "0x41A0F9dBA165D93aD1F956C09e10b89fdc4E2215",
        "0x6a06Ba5776B7ae40D69B7f6359fD556Fb59eFE69",
        "0xf604B7A589F8f5676a72bDE6A2a57b2349fcf696",
        "0x59757c841e4B14b038905689a2BB8d52F54CeA2F",
        "0x526522e2e586457b0d090829a70b0094f6878cd4",
        "0x80F22c61d498A4284f8086a27022B940c86194aF",
        "0xF43B1C6a090230B98b1cd043D8C88E4A34F6a79e"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new();

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};