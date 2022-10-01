// TODO fix broken filter
// add grouping and general stats

import './App.css';
import React from 'react';
import Table from './components/Table';
import clean from './utilities/clean';
import ToggleSwitch from './components/ToggleSwitch';

const github_url = 'https://raw.githubusercontent.com/waymondrang/budgetbuddy/main/src/extension/manifest.json';

export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      raw_data: {
        data: [],
        version: "",
        last_update: ""
      },
      data: [],
      filtered_data: [],
      locations: [],
      filter: {
        location: "bb_all_locations"
      },
      settings: { // Default settings
        use_location_parser: true
      },
      version: "",
      outdated_version: -1,
      debug: new URLSearchParams(window.location.search).has("debug"),
      start_date: new Date(2022, 9 - 1, 19, 0, 0, 0, 0),
      end_date: new Date(2023, 6 - 1, 16 + 1, 0, 0, 0, 0), // School year end date (June 16th + 1, 2023 00:00:00)
      modal: false, // Should be false, unless debugging
      expandFilters: false,
    }

    this.onLocationFilterChange = this.onLocationFilterChange.bind(this);
    this.spentDateDining = this.spentDateDining.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.resetData = this.resetData.bind(this);
    this.downloadData = this.downloadData.bind(this);
    this.updateSettings = this.updateSettings.bind(this);
  }

  async componentDidMount() {
    const self = this;
    if (this.state.debug) {
      let raw_data = { "data": [{ "account": "Dining Dollars Rollover", "amount": 46.59, "date": "2022-07-11T23:09:00.000Z", "id": "a35bd4d463b75fbc1a2780dd00a0452c", "location": "Triton Card Accounts Services HDH-R-APP-AD", "matched": false, "time": "4:09 PM", "type": "Debit" }, { "account": "Dining Dollars Rollover", "amount": 60.52, "date": "2022-06-16T22:27:00.000Z", "id": "e6dbabfba680d8e22372bda38a83b462", "location": "Triton Card Accounts Services HDH-R-APP-AD", "matched": false, "time": "3:27 PM", "type": "Credit" }, { "account": "Dining Dollars", "amount": 60.52, "date": "2022-06-16T20:50:00.000Z", "id": "0b34164a8cea44dd655847d39c4860a6", "location": "Triton Card Accounts Services HDH-R-APP-AD", "matched": false, "time": "1:50 PM", "type": "Debit" }], "last_update": "9/18/2022, 1:56:14 PM PDT", "version": "1.0.2" };
      let settings = self.state.settings;
      let cleaned_data = clean(raw_data.data);
      raw_data.data = cleaned_data; // Update raw data with cleaned data
      let locations = settings.use_location_parser ? self.parseLocations(cleaned_data) : self.getLocations(cleaned_data);
      self.setState({
        data: cleaned_data,
        raw_data: raw_data,
        locations: locations,
        settings: settings
      })
    }
    // Fetch and process data from local storage
    try {
      window.chrome.storage.local.get(['data', 'settings'], async function (result) {
        let raw_data = result.data;
        let settings = Object.keys(result).includes("settings") ? result.settings : self.state.settings;
        let cleaned_data = clean(raw_data.data);
        raw_data.data = cleaned_data; // Update raw data with cleaned data
        let locations = settings.use_location_parser ? self.parseLocations(cleaned_data) : self.getLocations(cleaned_data);
        self.setState({
          data: cleaned_data,
          raw_data: raw_data,
          locations: locations,
          settings: settings
        })
      })
    } catch (e) {
      console.log("The below error, if regarding reading 'local', is expected and can be ignored in development mode.")
      console.log(e);
    }

    // Fetch and compare latest version
    try {
      let version = window.chrome.runtime.getManifest().version;
      let newest_mainfest = await fetch(github_url).then(result => result.json());
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

  /**
   * 
   * @param {RegExp} account Case-sensitive account name
   * @param {Array} data Data to filter
   * @returns {number} Total amount spent in category
   */
  calculateTotal(account, data) {
    if (!data) return;
    let total = 0;
    for (var transaction of data) {
      if ((transaction.account).match(account)) {
        total += transaction.type === "Credit" ? transaction.amount : -transaction.amount;
      }
    }
    return total.toFixed(2);
  }

  parseLocations(data) {
    if (!data) return;
    let locations = [];
    for (let transaction of data) {
      let match = /^(.*)(?:\s[0-9]+|\sleft|\sright|\smobile\s?o?r?d?e?r?i?n?g?)$/gmi.exec(transaction.location);
      let location = match ? match[1] : transaction.location;
      if (!locations.includes(location)) {
        locations.push(location);
      }
    }
    return locations.sort(function (a, b) { return a.localeCompare(b) });
  }

  getLocations(data) {
    let locations = [];
    for (let transaction of data) {
      if (!locations.includes(transaction.location)) {
        locations.push(transaction.location);
      }
    }
    return locations.sort(function (a, b) { return a.localeCompare(b) });
  }

  onLocationFilterChange(filter) {
    let data = filter.hdh_only ? (this.state.raw_data.data).filter(e => (e.location).match(/^hdh/gmi)) : this.state.raw_data.data; // Filter out HDH only
    data = filter.location === "bb_all_locations" ? data : data.filter(e => (e.location).includes(filter.location));
    if (filter.location === "bb_all_locations") {
      let locations = this.state.settings.use_location_parser ? this.parseLocations(data) : this.getLocations(data);
      this.setState({
        data: data,
        filter: filter,
        locations: locations
      })
    } else {
      let locations = this.state.settings.use_location_parser ? this.parseLocations(filter.hdh_only ? (this.state.raw_data.data).filter(e => (e.location).match(/^hdh/gmi)) : this.state.raw_data.data) : this.getLocations(filter.hdh_only ? (this.state.raw_data.data).filter(e => (e.location).match(/^hdh/gmi)) : this.state.raw_data.data);
      this.setState({
        data: data,
        filter: filter,
        locations: locations
      })
    }
  }

  // Currently unused
  daysLeft() {
    var currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    return Math.round((this.state.end_date - currentDay) / (1000 * 60 * 60 * 24));
  }

  // Currently unused
  daysPast() {
    var currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    return Math.round((currentDay - this.state.start_date) / (1000 * 60 * 60 * 24));
  }

  // Currently unused
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
      data: {}
    });
    this.setState({
      data: [],
      raw_data: {},
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

  /**
   * Updates settings using name ToggleSwitch
   * @param {*} e Click event
   */
  updateSettings(e) {
    try {
      let settings = this.state.settings;
      settings[e.target.name] = e.target.checked;
      this.setState({
        settings: settings
      })
      window.chrome.storage.local.set({
        settings: settings
      }, function () {
        console.log("Settings updated in local storage.");
      });
    } catch (e) {
      console.log("The below error, if regarding reading 'local', is expected and can be ignored in development mode.")
      console.log(e);
    }
  }

  render() {
    return (
      <div id="main">
        {this.state.modal ?
          <div id="modal">
            <div id="modal_background" onClick={this.toggleModal} />
            <div id="modal_content">
              <p className='extension_name'>BudgetBuddy Extension and Analyzer</p>
              <p className='extension_author'>Created by <a href='https://waymondrang.com'>Raymond Wang</a></p>
              <div id='modal_settings'>
                <div className='panel'>
                  <span>Use Location Parser</span>
                  <ToggleSwitch name="use_location_parser" checked={this.state.settings.use_location_parser} onChange={this.updateSettings} />
                </div>
              </div>
              <div id='modal_buttons'>
                <button onClick={this.downloadData}>Download Data</button>
                <button onClick={this.resetData} className='warning'>Reset Data</button>
              </div>
            </div>
          </div> : null
        }
        <section id="analyzer">
          <h1 id="title">BudgetBuddy Analyzer</h1>
          <span>Click on a header field to sort. Click again to reverse.</span>
          <div className="options">
            <div className='default-options'>
              <select className="option" value={this.state.filter.location} onChange={(e) => {
                let filter = this.state.filter;
                filter.location = e.target.value;
                this.onLocationFilterChange(filter);
              }}>
                <option key="bb_default" value="" disabled>Select Location</option>
                <option key="bb_all_locations" value="bb_all_locations">All Locations</option>
                {this.state.locations.map(e =>
                  <option key={e} value={e}>{e}</option>
                )}
              </select>
              <button onClick={(e) => {
                this.setState({
                  expandFilters: !this.state.expandFilters
                })
                e.target.innerText = this.state.expandFilters ? "Expand Filters" : "Collapse Filters"
              }}>Expand Filters</button>
            </div>
            {this.state.expandFilters ?
              <div className='more-options'>
                <div className='option-panel'>
                  <span>Show HDH Only</span>
                  <input type="checkbox" name="hdh_only" checked={this.state.filter.hdh_only} onChange={(e) => {
                    let filter = this.state.filter;
                    filter.hdh_only = e.target.checked;
                    this.onLocationFilterChange(filter);
                  }} />
                </div>
              </div> : null}
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
                  <td>${this.calculateTotal(new RegExp(/^dining dollars/gmi), this.state.data)}</td>
                  <td>${this.calculateTotal(new RegExp(/^triton cash/gmi), this.state.data)}</td>
                  <td>${this.calculateTotal(new RegExp(/^triton2go/gmi), this.state.data)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer>
            <div id="update">
              <p>Data Updated: {this.state.raw_data.last_update}</p>
              <a className='update_button' href="https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx"><button>Update Data</button></a>
            </div>
            <p id="transactions">{this.state.data.length} {this.state.data.length !== 1 ? "Transactions" : "Transaction"}</p>
          </footer>
        </section>
        {/* <hr /> */}
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
        <div id='extra_container'>
          <section id='extra'>
            <p>{this.state.debug ? " Debug Mode" : null} {this.state.version ? "v" + this.state.version : null} {this.state.outdated_version === 2 ? "(Latest)" : this.state.outdated_version === 3 ? "(Preview)" : null}</p>
            <button className="icon_button" id='about' onClick={this.toggleModal}>
              <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox='0 0 48 48'><path d="M24.15 34q.65 0 1.075-.425.425-.425.425-1.075v-9.05q0-.6-.45-1.025Q24.75 22 24.15 22q-.65 0-1.075.425-.425.425-.425 1.075v9.05q0 .6.45 1.025.45.425 1.05.425ZM24 18.3q.7 0 1.175-.45.475-.45.475-1.15t-.475-1.2Q24.7 15 24 15q-.7 0-1.175.5-.475.5-.475 1.2t.475 1.15q.475.45 1.175.45ZM24 44q-4.25 0-7.9-1.525-3.65-1.525-6.35-4.225-2.7-2.7-4.225-6.35Q4 28.25 4 24q0-4.2 1.525-7.85Q7.05 12.5 9.75 9.8q2.7-2.7 6.35-4.25Q19.75 4 24 4q4.2 0 7.85 1.55Q35.5 7.1 38.2 9.8q2.7 2.7 4.25 6.35Q44 19.8 44 24q0 4.25-1.55 7.9-1.55 3.65-4.25 6.35-2.7 2.7-6.35 4.225Q28.2 44 24 44Zm0-20Zm0 17q7 0 12-5t5-12q0-7-5-12T24 7q-7 0-12 5T7 24q0 7 5 12t12 5Z" /></svg>
            </button>
          </section>
        </div>
      </div>
    )
  }
}
