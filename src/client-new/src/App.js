import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import Navigation from './components/Navigation';
import getWeb3 from './utils/getWeb3';

class App extends Component {

  constructor() {
    super();
    this.state = {
      web3: null
    };
  }

  componentDidMount = async () => {
    try {
      // Get network provider and web3 instance.
      const web3 = await getWeb3();

      // Use web3 to get the user's accounts.
      const accounts = await web3.eth.getAccounts();
      console.log('User address: ' + accounts[0]);

      // Get the contract instance.
      
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contracts. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    return (
      <div className="App">
        <Navigation />
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1> Ethereum and InterPlanetary File System(IPFS) with Create React App</h1>
        </header>
        <hr/>
      </div>
    );
  }
}

export default App;
