// TODO fix broken filter
// add grouping and general stats

import './App.css';
import React from 'react';
import Table from './components/Table';
import clean from './utilities/clean';

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      method: "date",
      primary_param: "",
      locations: [],
      filter: {
        location: ""
      },
      last_update: "",
      version: "",
      outdated_version: -1,
      newest_version: "",
      debug: new URLSearchParams(window.location.search).has("debug"),
      data: [],
      filtered_data: [],
      dining_dollars: -1,
      triton_cash: -1,
      triton2go: -1,
      start_date: new Date(2022, 9 - 1, 19, 0, 0, 0, 0),
      end_date: new Date(2023, 6 - 1, 16 + 1, 0, 0, 0, 0), // School year end date (June 16th + 1, 2023 00:00:00)
      modal: false,
    }

    this.onLocationFilterChange = this.onLocationFilterChange.bind(this);
    this.applyFilter = this.applyFilter.bind(this);
    this.spentDateDining = this.spentDateDining.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.resetData = this.resetData.bind(this);
    this.downloadData = this.downloadData.bind(this);
  }

  async componentDidMount() {
    const self = this;
    if (this.state.debug) {
      var locations = [];
      var version = "99.99.99";
      var data = [{ "account": "Dining Dollars Rollover", "amount": 46.59, "date": "2022-07-11T23:09:00.000Z", "id": "b8ebcce8f3a3a6232199708438c4bcaf", "location": "Triton Card Accounts Services HDH-R-APP-AD", "time": "4:09 PM", "type": "Debit" }, { "account": "Dining Dollars Rollover", "amount": 60.52, "date": "2022-06-16T22:27:00.000Z", "id": "a4bd8d3a7f6ae6d892443e9534771ad8", "location": "Triton Card Accounts Services HDH-R-APP-AD", "time": "3:27 PM", "type": "Credit" }, { "account": "Dining Dollars", "amount": 60.52, "date": "2022-06-16T20:50:00.000Z", "id": "bc52301799487a43c23e51eb7a732c44", "location": "Triton Card Accounts Services HDH-R-APP-AD", "time": "1:50 PM", "type": "Debit" }, { "account": "Triton2Go Dining Dollars", "amount": 5, "date": "2022-06-16T13:00:00.000Z", "id": "f0770e6f954b779361e8096bcbf16d44", "location": "System HDH-DINERO", "time": "6:00 AM", "type": "Credit" }, { "account": "Dining Dollars", "amount": 21.28, "date": "2022-06-08T03:35:00.000Z", "id": "0150b20cc6e5c0a2befd13c19e261b6e", "location": "HDH Seventh Market Seventh Market 3", "time": "8:35 PM", "type": "Debit" }];
      let cleaned_data = clean(data);
      let last_update = "Debug Season";
      for (var transaction of data) {
        if (!locations.includes(transaction["location"])) {
          locations.push(transaction["location"]);
        }
      }
      var newest_version;
      try {
        var newest_mainfest = await fetch("https://raw.githubusercontent.com/waymondrang/budgetbuddy/main/src/chrome/manifest.json").then(result => result.json())
        newest_version = newest_mainfest["version"];
      } catch (e) {
        console.log(e)
      }
      self.setState({
        data: cleaned_data,
        version: version,
        newest_version: newest_version,
        outdated_version: (newest_version && version) ? (+((version).replace(/[^0-9]/gm, "")) < +((newest_version).replace(/[^0-9]/gm, "")) ? 1 : +((version).replace(/[^0-9]/gm, "")) === +((newest_version).replace(/[^0-9]/gm, "")) ? 2 : 3) : 0,
        filtered_data: data,
        last_update: last_update,
        locations: locations.sort(function (a, b) { return a.localeCompare(b) }),
        dining_dollars: +(data.filter(e => e["type"] === "Credit" && (e["account"] === "Dining Dollars" || e["account"] === "Dining Dollars Rollover")).reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"] === "Debit" && (e["account"] === "Dining Dollars" || e["account"] === "Dining Dollars Rollover")).reduce((a, b) => a + b["amount"], 0)).toFixed(2)
      })
      return
    }

    // Fetch and process data from local storage
    try {
      window.chrome.storage.local.get(['data', 'last_update'], async function (result) {
        var data = result["data"];
        var last_update = result["last_update"]
        if (!data) {
          console.log("no data found!");
          return;
        }
        var locations = [];
        for (var transaction of data) {
          if (!locations.includes(transaction["location"])) {
            locations.push(transaction["location"]);
          }
        }
        self.setState({
          data: data,
          filtered_data: data,
          last_update: last_update,
          locations: locations.sort(function (a, b) { return a.localeCompare(b) }),
          dining_dollars: +(data.filter(e => e["type"] === "Credit" && (e["account"] === "Dining Dollars" || e["account"] === "Dining Dollars Rollover")).reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"] === "Debit" && (e["account"] === "Dining Dollars" || e["account"] === "Dining Dollars Rollover")).reduce((a, b) => a + b["amount"], 0)).toFixed(2),
          triton_cash: +(data.filter(e => e["type"] === "Credit" && e["account"] === "Triton Cash").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"] === "Debit" && e["account"] === "Triton Cash").reduce((a, b) => a + b["amount"], 0)).toFixed(2),
          triton2go: +(data.filter(e => e["type"] === "Credit" && e["account"] === "Triton2Go Dining Dollars").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"] === "Debit" && e["account"] === "Triton2Go Dining Dollars").reduce((a, b) => a + b["amount"], 0)).toFixed(2)
        })
      })
    } catch (e) {
      console.log("The below error, if regarding reading 'local', is expected and can be ignored in development mode.")
      console.log(e);
    }

    // Fetch and compare latest version
    try {
      let version = window.chrome.runtime.getManifest().version;
      let newest_mainfest = await fetch("https://raw.githubusercontent.com/waymondrang/budgetbuddy/main/src/chrome/manifest.json").then(result => result.json());
      let newest_version = newest_mainfest["version"];
      self.setState({
        version: version,
        outdated_version: (newest_version && version) ? (+((version).replace(/[^0-9]/gm, "")) < +((newest_version).replace(/[^0-9]/gm, "")) ? 1 : +((version).replace(/[^0-9]/gm, "")) === +((newest_version).replace(/[^0-9]/gm, "")) ? 2 : 3) : 0,
      })
    } catch (e) {
      self.setState({
        outdated_version: 0,
      });
      console.log("The below error, if regarding reading 'getManifest', is expected and can be ignored in development mode.");
      console.log(e);
    }
  }

  onLocationFilterChange(e) {
    var filter = this.state.filter;
    var location = e.target.value;
    filter["location"] = location;
    if (location === "bb_all_locations") {
      this.setState({
        filtered_data: this.state.data,
        filter: filter
      })
    } else {
      var data = this.state.data.filter(e => e["location"] === location);
      this.setState({
        filtered_data: data,
        filter: filter
      })
    }
  }

  // Unused
  applyFilter(e) {
    console.log("applying filter", this.state.filter);
    if (this.state.filter["location"]) {
      if (this.state.filter["location"] === "bb_all_locations") {
        this.setState({
          filtered_data: this.state.data
        })
      } else {
        var data = this.state.data.filter(e => e["location"] === this.state.filter["location"]);
        this.setState({
          filtered_data: data
        })
      }
    }
  }

  daysLeft() {
    var currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    return Math.round((this.state.end_date - currentDay) / (1000 * 60 * 60 * 24));
  }

  daysPast() {
    var currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    return Math.round((currentDay - this.state.start_date) / (1000 * 60 * 60 * 24));
  }

  spentDateDining(start_date, end_date) {
    if (!this.state.data.length) {
      return
    }
    var startCurrentDay = new Date(start_date);
    startCurrentDay.setHours(0, 0, 0, 0);
    var endCurrentDay = new Date(end_date);
    endCurrentDay.setHours(23, 59, 59, 999);
    return +(this.state.data.filter(e => e["type"] === "Debit" && (e["account"] === "Dining Dollars" || e["account"] === "Dining Dollars Rollover") && new Date(e["date"]).valueOf() > startCurrentDay.valueOf() && new Date(e["date"]).valueOf() < endCurrentDay.valueOf()).reduce((a, b) => a + b["amount"], 0)).toFixed(2);
  }

  toggleModal() {
    this.setState({
      modal: !this.state.modal
    })
  }

  resetData() {
    window.chrome.storage.local.set({
      data: []
    });
    this.setState({
      data: [],
      filtered_data: [],
    })
  }

  /**
   * Downloads data as a JSON file
   */
  downloadData() {
    let data_ = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state.data));
    let download_node = document.createElement('a');
    download_node.setAttribute("href", data_);
    download_node.setAttribute("download", "budgetbuddy_data.json");
    document.body.appendChild(download_node); // Required for Firefox
    download_node.click();
    download_node.remove();
  }

  render() {
    return (
      <div id="main">
        {this.state.modal ?
          <div id="modal">
            <div id="modal-background" onClick={this.toggleModal} />
            <div id="modal-content">
              <p className='extension-name'>Budget Buddy Extension and Web App</p>
              <p className='extension-author'>Created by <a href='https://waymondrang.com'>Raymond Wang</a></p>
              <button onClick={this.resetData}>Reset Data</button>
              <button onClick={this.downloadData}>Download Data</button>
            </div>
          </div> : null
        }
        <section id="analyzer">
          <h1 id="title">Budget Buddy Analyzer</h1>
          <p>Shift + Click on a header field to set it as the primary sort parameter.</p>
          <div className="options">
            <select className="option" value={this.state.filter["location"]} onChange={this.onLocationFilterChange}>
              <option key="bb_default" value="" disabled>Select Location</option>
              <option key="bb_all_locations" value="bb_all_locations">All Locations</option>
              {this.state.locations.map(e =>
                <option key={e} value={e}>{e}</option>
              )}
            </select>
          </div>
          <Table data={this.state.data} />
          <div className="totals_table">
            <table>
              <thead className="totals_table_head">
                <tr>
                  <th>Total</th>
                  <th>Dining Dollars</th>
                  <th>Triton Cash</th>
                  <th>Triton2Go Dining Dollars</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td></td>
                  <td>${this.state.dining_dollars}</td>
                  <td>${this.state.triton_cash}</td>
                  <td>${this.state.triton2go}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer>
            <div id="update">
              <p>Data Updated: {this.state.last_update}</p>
              <a className='update_button' href="https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx"><button>Update</button></a>
            </div>
            <p id="transactions">{this.state.filtered_data.length} {this.state.filtered_data.length !== 1 ? "Transactions" : "Transaction"}</p>
          </footer>
        </section>
        <hr />
        {/* <section>
          <h1>Dining Dollars</h1>
          <div className="info_card_container">
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Current Balance</p>
                <span className="info_body">${this.state.dining_dollars}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Spent</p>
                <span className="info_body">${this.spentDateDining(this.state.start_date, new Date())}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Allowance/Day</p>
                <span className="info_body">${+(this.state.dining_dollars / this.daysLeft()).toFixed(2)}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Spent Today</p>
                <span className="info_body">${this.spentDateDining(new Date(), new Date())}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Spent Yesterday</p>
                <span className="info_body">${this.spentDateDining(new Date() - (1000 * 60 * 60 * 24), new Date() - (1000 * 60 * 60 * 24))}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Spent/Day</p>
                <span className="info_body">${+(this.spentDateDining(this.state.start_date, new Date()) / this.daysPast()).toFixed(2)}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Days Left</p>
                <span className="info_body">{this.daysLeft()}</span>
              </div>
            </div>
            <div className="info_card">
              <div className="info_card_content">
                <p className="info_title">Days Past</p>
                <span className="info_body">{this.daysPast()}</span>
              </div>
            </div>
          </div>
        </section> 
        <hr /> */}
        <section id='extra'>
          <p>{this.state.debug ? " Debug Mode" : null} {this.state.version ? "v" + this.state.version : null} {this.state.outdated_version === 2 ? "(Latest)" : this.state.outdated_version === 3 ? "(Preview)" : null}</p>
          <button className="icon_button" id='about' onClick={this.toggleModal}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox='0 0 48 48'><path d="M24.15 34q.65 0 1.075-.425.425-.425.425-1.075v-9.05q0-.6-.45-1.025Q24.75 22 24.15 22q-.65 0-1.075.425-.425.425-.425 1.075v9.05q0 .6.45 1.025.45.425 1.05.425ZM24 18.3q.7 0 1.175-.45.475-.45.475-1.15t-.475-1.2Q24.7 15 24 15q-.7 0-1.175.5-.475.5-.475 1.2t.475 1.15q.475.45 1.175.45ZM24 44q-4.25 0-7.9-1.525-3.65-1.525-6.35-4.225-2.7-2.7-4.225-6.35Q4 28.25 4 24q0-4.2 1.525-7.85Q7.05 12.5 9.75 9.8q2.7-2.7 6.35-4.25Q19.75 4 24 4q4.2 0 7.85 1.55Q35.5 7.1 38.2 9.8q2.7 2.7 4.25 6.35Q44 19.8 44 24q0 4.25-1.55 7.9-1.55 3.65-4.25 6.35-2.7 2.7-6.35 4.225Q28.2 44 24 44Zm0-20Zm0 17q7 0 12-5t5-12q0-7-5-12T24 7q-7 0-12 5T7 24q0 7 5 12t12 5Z" /></svg>
          </button>
        </section>
      </div>
    )
  }
}
