import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import web3 from './web3';

const config = Config['localhost'];

const flightSuretyDataContract = new web3.eth.Contract(
    FlightSuretyData.abi,
    config.dataAddress
);

export default flightSuretyDataContract;