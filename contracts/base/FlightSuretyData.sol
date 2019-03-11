pragma solidity ^0.5.0;

import "../core/Ownable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData is Ownable {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    using SafeMath for uint8; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    // Define enum 'State' with the following values:
    enum AirlineRegistrationState 
    { 
        InProcessToBeRegistered,    // 0
        Registered,                 // 1
        RegisteredDenied            // 2
    }

    enum InsuranceState 
    { 
        BougthByPassenger,          // 0
        ReadyForPayoutByPassenger,  // 1
        WithdrawToPassengerDone,    // 2
        Expired                     // 3
    }

    struct Airline {
        string name;
        AirlineRegistrationState registrationState;
        bool isRegistered;
        bool isFunded;
        uint256 votes;
        bool existItem;
    }

    struct Flight {
        bool isRegistered;
        bytes32 code;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        bytes32 departure;
        bytes32 arrival;
    }

    struct Insurance {
        bool existInsurance;
        bytes32 code;
        uint256 amountPaid;
        InsuranceState status;
    }

    struct Passenger {
        bool existPassenger;
        mapping(bytes32 => Insurance) insurances;
        bytes32[] insuranceKeys;
    }

    bool private operational = true;                            // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;    // Mapping for authorize contract caller
    mapping(address => Airline) private airlines;               // Mapping for airline
    mapping(bytes32 => Flight) private flights;                 // Mapping for flights
    bytes32[] flightsKeys;                                      // To iterate the mapping list and get the flights for the Client
    mapping(address => Passenger) private passengers;           // Mapping for passengers-insurances
    address[] private passengersWithInsurancesKeys;             // Array of passengers with insurance for internal handel
    uint8 private minAirlinesNumberMutipartyConsensus;          // Min Number of airlines necessary to start the multiparty consensus to register a new airline
    uint256 private registeredAirlines;                         // Number of registered airlines
    uint256 private minSubmitionFund;                           // Min cost to fund for an airline
    uint256 private minInsurancePay;                            // Min pay to buy and insurance                   

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AuthorizeContractCaller(address authorizedCaller);
    event DeauthorizeContractCaller(address deauthorizedCaller);
    event OperatingStatusUpdated(bool operationalStatus);
    event MinAirlinesNumberMutipartyConsensusUpdated(uint8 newValue);
    event MinSubmitionFundUpdated(uint256 newValue);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        airlines[owner()] = Airline({
            name: "Lufthansa",
            registrationState: AirlineRegistrationState.Registered,
            isRegistered: true,
            isFunded: true,
            votes: 1,
            existItem: true});
        registeredAirlines = 1;
        minAirlinesNumberMutipartyConsensus = 4;
        minSubmitionFund = 1 ether;
        minInsurancePay = 100000000000000 wei;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires an authorized contract address to be called
    */
    modifier requireIsCallerAuthorized()
    {
        require(authorizedContracts[msg.sender] == 1, "Caller is not authorize to call this function in data contract");
        _;
    }

    /**
    * @dev Modifier that requires registered and funded airline to register a new airline
    */
    modifier requireIsCallerAirlineRegistered(address callerAirline)
    {
        require(airlines[callerAirline].registrationState == AirlineRegistrationState.Registered, "Caller Airline is not register");
        _;
    }

    /**
    * @dev Modifier that requires registered and funded airline to register a new airline
    */
    modifier requireIsCallerAirlineFunded(address callerAirline)
    {
        require(airlines[callerAirline].isFunded, "Caller Airline is not funded");
        _;
    }

    /**
    * @dev Modifier to check if airline doesnt exist in database
    */
    modifier notExistAirline(address airlineAddress) {
        require(!airlines[airlineAddress].existItem, "Airline already exist in the database");
        _;
    }

    /**
    * @dev Modifier to check if airline already exist in database
    */
    modifier existAirline(address airlineAddress) {
        require(airlines[airlineAddress].existItem, "Airline already exist in the database");
        _;
    }

    /**
    * @dev Modifier to check if a flight doesnt exist in database
    */
    modifier requireNotExistFlight(bytes32 code) {
        require(!flights[code].isRegistered, "Flight already exist in the database");
        _;
    }

    /**
    * @dev Modifier to check if a flight already exist in database
    */
    modifier requireExistFlight(bytes32 code) {
        require(flights[code].isRegistered, "Flight already exist in the database");
        _;
    }

    /**
    * @dev Modifier create an entry in passengers mapping if passenger doesn´t exit
    */
    modifier preProcessIfPassengerNotExist(address passenger) {
        if(!passengers[passenger].existPassenger) {
            passengers[passenger] =  Passenger({
                existPassenger: true,
                insuranceKeys: new bytes32[](0)
            });
        }
        passengersWithInsurancesKeys.push(passenger);
        _;
    }

    /**
    * @dev Modifier check if passenger exist
    */
    modifier requireExistPassenger(address passenger) {
        require(passengers[passenger].existPassenger, "Passenger doesnt exist");
        _;
    }

    /**
    * @dev Modifier create an entry in passengers mapping if passenger doesn´t exit
    */
    modifier requireInsuranceCodeNotExitPreviously(address passenger, bytes32 code) {
        require(!passengers[passenger].insurances[code].existInsurance, "Insurance exist before to create a new one");
        _;
    }

    /**
    * @dev Modifier to check if an insurance exist for an specific passenger
    */
    modifier requireInsuranceCodeExit(address passenger, bytes32 code) {
        require(passengers[passenger].insurances[code].existInsurance, "Insurance not exist");
        _;
    }

    /**
    * @dev Modifier create an entry in passengers mapping if passenger doesn´t exit
    */
    modifier requireInsurancePaidEnough(uint256 amount) {
        require(amount >= minInsurancePay, "Insurance amount paid not enough");
        _;
    }

    /**
    * @dev Modifier to check if an insurance status is ready to payout withdraw for an specific passenger and insurance
    */
    modifier requireInsuranceStatusReadyForPayout(address passenger, bytes32 code) {
        require(passengers[passenger].insurances[code].status == InsuranceState.ReadyForPayoutByPassenger, "Insurance status not ReadyForPayoutByPassenger");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus(bool mode) external onlyOwner() {
        require(operational != mode, "Error operational state has already the new status");
        operational = mode;
        emit OperatingStatusUpdated(operational);
    }

    /**
    * @dev Sets minAirlinesNumberMutipartyConsesus variable
    *
    */    
    function setMinAirlinesNumberMutipartyConsensus(uint8 value) external onlyOwner() {
        minAirlinesNumberMutipartyConsensus = value;
        emit MinAirlinesNumberMutipartyConsensusUpdated(minAirlinesNumberMutipartyConsensus);
    }

    /**
    * @dev Get minAirlinesNumberMutipartyConsesus variable
    *
    */    
    function getMinAirlinesNumberMutipartyConsensus() 
        external view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(uint8)
    {
        return minAirlinesNumberMutipartyConsensus;
    }

    /**
    * @dev Sets minSubmitionFund variable
    *
    */    
    function setMinSubmitionFund(uint256 value) external onlyOwner() {
        minSubmitionFund = value;
        emit MinSubmitionFundUpdated(minSubmitionFund);
    }

    /**
    * @dev Get minSubmitionFund variable
    *
    */    
    function getRegisteredAirlines() 
        external view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(uint256)
    {
        return registeredAirlines;
    }

    /**
    * @dev Get minSubmitionFund variable
    *
    */    
    function getMinSubmitionFund() 
        external view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(uint256)
    {
        return minSubmitionFund;
    }

    /**
    * @dev Fetch configuration data of the contract
    *
    * Only contract owner can fetch this data and make easy for developer to check the current contract configuration 
    */    
    function fetchDataContractConfiguration() 
        external view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(bool, uint8 ,uint256, uint256) 
    {
        return(
            operational,
            minAirlinesNumberMutipartyConsensus,
            minSubmitionFund,
            registeredAirlines
        );
    }

    /**
    * @dev Authorize contract address to be a caller for the data contract
    *
    * Only contract addresses stored in the mapping variable are able to call the data contract
    */    
    function authorizeContractCaller
    (
        address contractAddress
    ) 
        external 
        onlyOwner()
    {
        authorizedContracts[contractAddress] = 1;
        emit AuthorizeContractCaller(contractAddress);
    }

    /**
    * @dev Deauthorize contract address to be a caller for the data contract
    *
    * Only contract addresses stored in the mapping variable are able to call the data contract
    */    
    function deauthorizeContractCaller(address contractAddress) external onlyOwner() {
        delete authorizedContracts[contractAddress];
        emit DeauthorizeContractCaller(contractAddress);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline(
        address airlineAddressOrigin,
        address airlineAddressToRegister,
        string calldata airlineName,
        bool requireMultipartyConsensus
    ) 
        external 
        requireIsCallerAuthorized()
        requireIsOperational()
        notExistAirline(airlineAddressToRegister)
        requireIsCallerAirlineRegistered(airlineAddressOrigin)
        requireIsCallerAirlineFunded(airlineAddressOrigin)
        returns(AirlineRegistrationState, uint256)
    {
        if (!requireMultipartyConsensus) {
            // Save the airline in the airlines mapping
            airlines[airlineAddressToRegister] = Airline({
                name: airlineName,
                registrationState: AirlineRegistrationState.Registered,
                isRegistered: true, 
                isFunded: false,
                votes: 0,
                existItem: true});
            registeredAirlines = registeredAirlines.add(1);
        } else {
            // Save the airline in the airlines mapping
            airlines[airlineAddressToRegister] = Airline({
                name: airlineName,
                registrationState: AirlineRegistrationState.InProcessToBeRegistered,
                isRegistered: false, 
                isFunded: false,
                votes: 0,
                existItem: true});
        }
        // Increment the registeredAirlines variable
        return (airlines[airlineAddressToRegister].registrationState, registeredAirlines);
    }

    /**
    * @dev Fetch airline data
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function fetchAirlineByAddress (address airlineAddress) 
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        existAirline(airlineAddress)
        returns(string memory, AirlineRegistrationState, uint256)
    {
        return(
            airlines[airlineAddress].name,
            airlines[airlineAddress].registrationState,
            airlines[airlineAddress].votes
        );
    }

    /**
    * @dev Vote to register a new airline in multiparty consensus
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function voteToRegisterAirline 
    (
        address airlineAddressOrigin, 
        address airlineAddressToBeVoted
    )
        external
        requireIsCallerAuthorized()
        requireIsOperational()
        requireIsCallerAirlineRegistered(airlineAddressOrigin)
        requireIsCallerAirlineFunded(airlineAddressOrigin)
        existAirline(airlineAddressToBeVoted)
    {
        airlines[airlineAddressToBeVoted].votes = airlines[airlineAddressToBeVoted].votes.add(1);
        // If more than 50% of the airline votes positively, the airline shall be registered
        if(airlines[airlineAddressToBeVoted].votes >= (registeredAirlines.div(2))) {
            airlines[airlineAddressToBeVoted].registrationState = AirlineRegistrationState.Registered;
        }
    }

    /**
    * @dev Update the airline fund fields
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function updateFundFieldAirline(
        address airlineAddressToSubmitFund
    )
        external
        requireIsCallerAuthorized()
        requireIsOperational()
        requireIsCallerAirlineRegistered(airlineAddressToSubmitFund)
    {
        airlines[airlineAddressToSubmitFund].isFunded = true;
    }

    /**
    * @dev Update the airline fund fields
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerFlight
    (
        bytes32 code,
        uint256 updatedTimestamp,
        address airline,
        bytes32 departure,
        bytes32 arrival
    )
        external
        requireIsCallerAuthorized()
        requireIsOperational()
        requireIsCallerAirlineRegistered(airline)
        requireIsCallerAirlineFunded(airline)
        requireNotExistFlight(code)
        returns(bytes32, address, uint8)
    {
        flights[code] = Flight({
            isRegistered: true,
            code: code,
            statusCode: STATUS_CODE_UNKNOWN,
            updatedTimestamp: updatedTimestamp,
            airline: airline,
            departure: departure,
            arrival: arrival
        });
        flightsKeys.push(code);
        return(flights[code].code, flights[code].airline, flights[code].statusCode);
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance
    (
        address passenger,
        uint256 amountPaid,
        bytes32 flightCode                        
    )
        external
        payable
        requireIsCallerAuthorized()
        requireIsOperational()
        requireExistFlight(flightCode)
        preProcessIfPassengerNotExist(passenger)
        requireInsuranceCodeNotExitPreviously(passenger, flightCode)
        requireInsurancePaidEnough(amountPaid)
        returns(address, bytes32, InsuranceState)
    {
        // Add Insurance data struct
        passengers[passenger].insurances[flightCode] = Insurance({
            existInsurance: true,
            code: flightCode,
            amountPaid: amountPaid,
            status: InsuranceState.BougthByPassenger
        });
        // Add to the insuranceKeys array the flightcode as key
        passengers[passenger].insuranceKeys.push(flightCode);
        return(
            passenger, 
            passengers[passenger].insurances[flightCode].code,
            passengers[passenger].insurances[flightCode].status
        );
    }

    /**
     *  @dev Credits payouts to insurees
     *       The insurance state is updated in this function in order to credit the payouts to insuree 
    */
    function creditInsurees
    (
        address passenger,
        bytes32 flightCodeInsuranceCode,
        uint8 flightStatus
    )
        external
        requireIsCallerAuthorized()
        requireIsOperational()
        requireExistPassenger(passenger)
    {
        // Check that insurance code exist for the passenger
        if (passengers[passenger].insurances[flightCodeInsuranceCode].existInsurance) {
            // Check status code ReadyForPayoutByPassenger
            if (flightStatus == STATUS_CODE_LATE_AIRLINE) {
                // Only if the delay is caused because of the airline the insurance will change its status tu
                passengers[passenger].insurances[flightCodeInsuranceCode].status = InsuranceState.ReadyForPayoutByPassenger;
            } else {
                passengers[passenger].insurances[flightCodeInsuranceCode].status = InsuranceState.Expired;
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function paymentWithdraw
    (
        address passenger,
        bytes32 flightCodeInsuranceCode
    )
        external
        requireInsuranceCodeExit(passenger, flightCodeInsuranceCode)
        requireInsuranceStatusReadyForPayout(passenger, flightCodeInsuranceCode)
        returns(bool)
    {
        passengers[passenger].insurances[flightCodeInsuranceCode].status = InsuranceState.WithdrawToPassengerDone;
        return true;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
    {
    }

    /**
    * @dev Fetch array of registered insurances by passenger key
    *
    */   
    function fetchActiveInsurancesKeysByPassenger
    (
        address passenger
    )
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        requireExistPassenger(passenger)
        returns(bytes32[] memory)
    {
        return passengers[passenger].insuranceKeys;
    }

    /**
    * @dev Fetch array of registered passengers
    *
    */   
    function fetchRegisteredPassengers
    (
    )
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(address[] memory)
    {
        return passengersWithInsurancesKeys;
    }

    /**
    * @dev Fetch array of registerd flights
    *
    */   
    function fetchInsuranceInfoByPassengerAndCode
    (
        address passenger,
        bytes32 flightCode
    )
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        requireExistPassenger(passenger)
        requireInsuranceCodeExit(passenger, flightCode)
        returns(bytes32, uint256, InsuranceState)
    {
        return (
            passengers[passenger].insurances[flightCode].code,
            passengers[passenger].insurances[flightCode].amountPaid,
            passengers[passenger].insurances[flightCode].status
        );
    }

    /**
    * @dev Fetch array of registerd flights
    *
    */   
    function fetchRegisteredFlightsCodes
    (   
    )
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        returns(bytes32[] memory)
    {
        return flightsKeys;
    }

    /**
    * @dev Fetch information for specific regisered flight
    *
    */   
    function fetchRegisteredFlightInfoByCode
    (
        bytes32 flightCode
    )
        external
        view
        requireIsCallerAuthorized()
        requireIsOperational()
        requireExistFlight(flightCode)
        returns(bytes32, string memory, bytes32, bytes32)
    {
        return (
            flights[flightCode].code,
            airlines[flights[flightCode].airline].name,
            flights[flightCode].departure,
            flights[flightCode].arrival
        );
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }


}

