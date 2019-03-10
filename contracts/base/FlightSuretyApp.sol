pragma solidity ^0.5.0;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../core/Ownable.sol";
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp is Ownable {
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

    // FlightSuretyData contract
    FlightSuretyData flightSuretyData;

    //address private contractOwner;          // Account used to deploy contract

    /*struct Flight {
        bool isRegistered;
        bytes32 code;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        bytes32 departure;
        bytes32 arrival;
    }*/
    //mapping(bytes32 => Flight) private flights;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AirlineSubmittedFund (address airlineAdress, uint256 fund);
    event AirlineRegistration (uint8 state, uint256 airlinesRegistered);
    event MultipartyConsensusAirlineRegisterVote (address airlineEmitionVoteAddress, string airlineVotedName, uint256 airlineVotes);
    event FlightRegistered(bytes32 flightCode, address airline, uint8 status);
    event BoughtInsurance(address passenger, bytes32 flightCode, uint8 status);
    event PassengerWithdrawStatus(address passenger,bytes32 code, uint256 amount, uint8 status);
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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires enough fund to an airline to start operation in contract
    */
    modifier airlinePaidEnoughFundToOperate()
    {
        uint256 _minFound = flightSuretyData.getMinSubmitionFund();
        require(msg.value >= _minFound, "Paid amount not sufficient to register the airline"); 
        _;
    }

    /**
    * @dev Modifier that requires enough fund to an airline to start operation in contract
    */
    modifier checkAirlineFundValue() {
        _;
        uint256 _minFound = flightSuretyData.getMinSubmitionFund();
        uint amountToReturn = msg.value - _minFound;
        msg.sender.transfer(amountToReturn);
    }

    /**
    * @dev Modifier that requires enough fund to an airline to start operation in contract
    */
    modifier requireEnoughFundsInContract(address passenger, bytes32 flightCode)
    {
        (bytes32 code, uint256 amount, uint8 status) = flightSuretyData.fetchInsuranceInfoByPassengerAndCode(msg.sender, flightCode);
        require(address(this).balance >= amount.mul(15).div(10), "Contract funds not enough to withdraw the insurance"); 
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address flightSuretyDataContract
                                ) 
                                public 
    {
        flightSuretyData = FlightSuretyData(flightSuretyDataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
        public 
        pure 
        returns(bool) 
    {
        return true;  // Modify to call data contract's status
    }

    function getBalanceAppContract ()
        onlyOwner()
        external view
        returns(uint256)
    {
        return address(this).balance;
    }

    function fetchDataContractConfiguration()
        onlyOwner()
        requireIsOperational()
        external
        returns(bool operational, uint8 minAirlinesNumberMutipartyConsensus, uint256 minSubmitionFund, uint256 registeredAirlines) {
            (operational, minAirlinesNumberMutipartyConsensus, minSubmitionFund, registeredAirlines) = flightSuretyData.fetchDataContractConfiguration();
            return (
                operational,
                minAirlinesNumberMutipartyConsensus,
                minSubmitionFund,
                registeredAirlines
            );
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
    (
        address airlineAddressToRegister,
        string calldata airlineName
    )
        external
        requireIsOperational()
    {
        uint8 state;
        uint256 airlinesRegistered;
        if (flightSuretyData.getRegisteredAirlines() < flightSuretyData.getMinAirlinesNumberMutipartyConsensus()) {
            (state, airlinesRegistered) = flightSuretyData.registerAirline(msg.sender, airlineAddressToRegister, airlineName, false);
        } else {
            (state, airlinesRegistered) = flightSuretyData.registerAirline(msg.sender, airlineAddressToRegister, airlineName, true);
        }
        emit AirlineRegistration(state, airlinesRegistered);
    }

    /**
    * @dev Add an airline to the registration queue
    *
    */   
    function submitFundAirline()
        requireIsOperational()
        airlinePaidEnoughFundToOperate()
        checkAirlineFundValue()
        external payable
    {
        flightSuretyData.updateFundFieldAirline(msg.sender);
        emit AirlineSubmittedFund(msg.sender, msg.value);
    }

    /**
    * @dev Vote to register a new airline for multiparty consensus
    *
    */   
    function multipartyConsensusVote
    (
        address airlineAddressToBeRegister, 
        bool vote
    )
        external
        requireIsOperational()
    {
        // Fetch airline data by address
        (string memory _airlineName, uint8 _airlineState, uint256 _airlineVotes) = flightSuretyData.fetchAirlineByAddress(airlineAddressToBeRegister);
        // Check that the airline is in registration process state
        require(_airlineState == 0, "Airline not in process to be resgistered");
        if (vote) {
            flightSuretyData.voteToRegisterAirline(msg.sender, airlineAddressToBeRegister);
            _airlineVotes = _airlineVotes.add(1);
        }
        // Emit the proper event
        emit MultipartyConsensusAirlineRegisterVote (msg.sender, _airlineName, _airlineVotes);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
    (
        bytes32 code,
        uint256 updatedTimestamp,
        bytes32 departure,
        bytes32 arrival
    )
        external
        requireIsOperational()
    {
        (bytes32 flightCode, address airline, uint8 status) = flightSuretyData.registerFlight(code, updatedTimestamp, msg.sender, departure, arrival);
        emit FlightRegistered(flightCode, airline, status);
    }

    /**
    * @dev Fetch flights codes.
    *
    */  
    function fetchFlightsCodes()
        external
        view
        requireIsOperational()
        returns(bytes32[] memory)
    {
        return flightSuretyData.fetchRegisteredFlightsCodes();
    }

    /**
    * @dev Fetch flight info by code.
    *
    */  
    function fetchFlightInfoByCode
    (
        bytes32 flightCode
    )
        external
        view
        requireIsOperational()
        returns(bytes32, string memory, bytes32, bytes32)
    {
        (bytes32 code, string memory airlineName, bytes32 departure, bytes32 arrival) = flightSuretyData.fetchRegisteredFlightInfoByCode(flightCode);
        return (
            code,
            airlineName,
            departure,
            arrival
        );
    }

    /**
    * @dev Register a future flight for insuring.
    *
    */
    function buyInsurance
    (
        bytes32 flightCode
    )
        external
        payable
        requireIsOperational()
    {
        (address returnPassenger, bytes32 returnFlightCode, uint8 returnState) = flightSuretyData.buyInsurance(msg.sender, msg.value, flightCode);
        emit BoughtInsurance(returnPassenger, returnFlightCode, returnState);
    }

    /**
    * @dev Fetch insurances codes for a passenger.
    *
    */  
    function fetchActiveInsurancesKeysForPassenger()
        external
        view
        requireIsOperational()
        returns(bytes32[] memory)
    {
        return flightSuretyData.fetchActiveInsurancesKeysByPassenger(msg.sender);
    }

    /**
    * @dev Fetch insurances info for a passenger and code.
    *
    */  
    function fetchInsurancesInfoForPassengerAndCode
    (
        bytes32 flightCode
    )
        external
        view
        requireIsOperational()
        returns(bytes32, uint256, uint8)
    {
        (bytes32 code, uint256 amount, uint8 status) = flightSuretyData.fetchInsuranceInfoByPassengerAndCode(msg.sender, flightCode);
        return (
            code,
            amount,
            status
        );
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
    (
        uint8 index,
        address airline,
        bytes32 flight,
        uint256 timestamp,
        uint8 statusCode
    )
        internal
        requireIsOperational()
    {
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        // Close the response in order to handel only once
        oracleResponses[key].isOpen = false;
        if (statusCode == STATUS_CODE_UNKNOWN) {
            // Reopen again the request for response
            oracleResponses[key].isOpen = true;
        } else {
            // Fetch passengers array
            address[] memory passengersList = flightSuretyData.fetchRegisteredPassengers();
            for (uint256 paxIndex = 0; paxIndex < passengersList.length; paxIndex = paxIndex.add(1)) {
                flightSuretyData.creditInsurees (passengersList[paxIndex], flight, statusCode);
            }
        }
    }

    /**
    * @dev Passenger can withdraw any funds owed to them as a result of receiving credit for insurance payout
    *
    */  
    function passengerWithdraw
    (
        bytes32 flightCode
    )
        public
        payable
        requireIsOperational()
    {
        bytes32 code;
        uint256 amount;
        uint8 status;
        // Fetch amount paid for the insurance to calculate the withdraw payment amount
        (code, amount, status) = flightSuretyData.fetchInsuranceInfoByPassengerAndCode(msg.sender, flightCode);
        // Check if contract balance has enough ethers
        require(address(this).balance >= amount.mul(15).div(10), "Contract funds not enough to withdraw the insurance");
        // Update the insurance status before to transfer withdraw to passenger
        bool returnUpdateStatus = flightSuretyData.paymentWithdraw(msg.sender, flightCode);
        if(returnUpdateStatus) {
            msg.sender.transfer(amount.mul(15).div(10));
        }
        // Fetch current status for insurance after withdraw
        (code, amount, status) = flightSuretyData.fetchInsuranceInfoByPassengerAndCode(msg.sender, flightCode);
        // Emit proper event
        emit PassengerWithdrawStatus(msg.sender, code, amount.mul(15).div(10), status);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        bytes32 flight,
        uint256 timestamp                            
    )
        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 2;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, bytes32 flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, bytes32 flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, bytes32 flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            bytes32 flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request OR reponse in processing");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(index, airline, flight, timestamp, statusCode);
        }
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

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}

// ABI FlightSuretyData contract
contract FlightSuretyData {
    function registerAirline (address, address, string calldata, bool) external returns (uint8, uint256);
    function fetchDataContractConfiguration () external returns (bool, uint8, uint256, uint256);
    function isOperational () public view returns(bool);
    function getMinAirlinesNumberMutipartyConsensus () external view returns (uint8);
    function getMinSubmitionFund () external view returns (uint256);
    function getRegisteredAirlines () external view returns (uint256);
    function updateFundFieldAirline (address) external;
    function fetchAirlineByAddress (address airlineAddress) external view returns (string memory, uint8, uint256);
    function voteToRegisterAirline (address airlineAddressOrigin, address airlineAddressToBeVoted) external;
    function registerFlight (bytes32 code, uint256 updatedTimestamp, address airline, bytes32, bytes32) external returns (bytes32, address, uint8);
    function buyInsurance (address passenger, uint256 amountPaid, bytes32 flightCode) external payable returns (address, bytes32, uint8);
    function fetchRegisteredFlightsCodes () external view returns(bytes32[] memory);
    function fetchRegisteredFlightInfoByCode (bytes32 flightCode) external view returns (bytes32, string memory, bytes32, bytes32);
    function fetchActiveInsurancesKeysByPassenger (address passenger) external view returns(bytes32[] memory);
    function fetchRegisteredPassengers () external view returns(address[] memory);
    function fetchInsuranceInfoByPassengerAndCode (address passenger, bytes32 flightCode) external view returns(bytes32, uint256, uint8);
    function creditInsurees (address passenger, bytes32 flightCodeInsurance, uint8 flightStatus) external;
    function paymentWithdraw (address passenger, bytes32 flightCodeInsuranceCode) external returns(bool);
}