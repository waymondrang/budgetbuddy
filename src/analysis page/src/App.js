import './App.css';
import React from 'react';

// TODO: MAKE THE TABLE ITS OWN COMPONENT

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
      holidays: [
        {
          "holiday": "winter_break",
          "start": new Date(2021, 12 - 1, 19, 0, 0, 0, 0),
          "end": new Date(2022, 1 - 1, 1, 0, 0, 0, 0),
        },
        {
          "holiday": "mlk_jr_day",
          "start": new Date(2021, 1 - 1, 18, 0, 0, 0, 0),
          "end": new Date(2022, 1 - 1, 18, 0, 0, 0, 0),
        },
        {
          "holiday": "presidents_day",
          "start": new Date(2021, 2 - 1, 15, 0, 0, 0, 0),
          "end": new Date(2022, 2 - 1, 15, 0, 0, 0, 0),
        },
        {
          "holiday": "cesar_chavez_day",
          "start": new Date(2021, 3 - 1, 26, 0, 0, 0, 0),
          "end": new Date(2022, 3 - 1, 26, 0, 0, 0, 0),
        }
      ],
    }

    this.sortBy = this.sortBy.bind(this);
    this.onLocationFilterChange = this.onLocationFilterChange.bind(this);
    this.applyFilter = this.applyFilter.bind(this);
    this.spentDateDining = this.spentDateDining.bind(this);
  }

  async componentDidMount() {
    const self = this;
    if (this.state.debug) {
      var locations = [];
      var version = "99.99.99";
      var data = [{ "account": "Dining Dollars", "amount": 12.59, "date": "2021-11-29T18:35:00.000Z", "id": "213a772c-56ac-4125-9e33-f17261b018f2", "location": "HDH Seventh Market Seventh Market 3", "time": "10:35 AM", "type": "Debit" }, { "account": "Triton Cash", "amount": 1, "date": "2021-11-27T16:50:00.000Z", "id": "49bbd629-3e8c-44db-b8fb-1cc005a1ee00", "location": "Laundry Village Building 3 Left", "time": "8:50 AM", "type": "Debit" }, { "account": "Triton Cash", "amount": 1, "date": "2021-11-27T16:50:00.000Z", "id": "4cb1eaf7-3f05-4f07-8023-d77029f25743", "location": "Laundry Village Building 3 Left", "time": "8:50 AM", "type": "Debit" }];
      var last_update = "Debug Season";
      for (var transaction of data) {
        if (!locations.includes(transaction["location"])) {
          locations.push(transaction["location"]);
        }
      }
      var newest_version;
      try {
        var newest_mainfest = await fetch("https://raw.githubusercontent.com/waymondrang/budget-buddy/main/manifest.json").then(result => result.json())
        newest_version = newest_mainfest["version"];
      } catch (e) {
        console.log(e)
      }
      self.setState({
        data: data,
        version: version,
        newest_version: newest_version,
        outdated_version: (newest_version && version) ? (+((version).replace(/[^0-9]/gm, "")) < +((newest_version).replace(/[^0-9]/gm, "")) ? 1 : +((version).replace(/[^0-9]/gm, "")) === +((newest_version).replace(/[^0-9]/gm, "")) ? 2 : 3) : 0,
        filtered_data: data,
        last_update: last_update,
        locations: locations.sort(function (a, b) { return a.localeCompare(b) }),
        dining_dollars: data.filter(e => e["type"].toLowerCase() === "credit" && e["account"].toLowerCase() === "dining dollars").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"].toLowerCase() === "debit" && e["account"].toLowerCase() === "dining dollars").reduce((a, b) => +(a + b["amount"]).toFixed(2), 0)
      })
      return
    }
    try {
      window.chrome.storage.local.get(['data', 'last_update'], async function (result) {
        var data = result["data"];
        var last_update = result["last_update"]
        var version = window.chrome.runtime.getManifest().version;
        if (!data) {
          console.log("no data found!");
          return;
        }
        var newest_version;
        try {
          var newest_mainfest = await fetch("https://raw.githubusercontent.com/waymondrang/budget-buddy/main/manifest.json").then(result => result.json())
          newest_version = newest_mainfest["version"];
        } catch (e) {
          console.log(e)
        }
        var locations = [];
        for (var transaction of data) {
          if (!locations.includes(transaction["location"])) {
            locations.push(transaction["location"]);
          }
        }
        self.setState({
          data: data,
          version: version,
          newest_version: newest_version,
          outdated_version: (newest_version && version) ? (+((version).replace(/[^0-9]/gm, "")) < +((newest_version).replace(/[^0-9]/gm, "")) ? 1 : +((version).replace(/[^0-9]/gm, "")) === +((newest_version).replace(/[^0-9]/gm, "")) ? 2 : 3) : 0,
          filtered_data: data,
          last_update: last_update,
          locations: locations.sort(function (a, b) { return a.localeCompare(b) }),
          dining_dollars: data.filter(e => e["type"].toLowerCase() === "credit" && e["account"].toLowerCase() === "dining dollars").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"].toLowerCase() === "debit" && e["account"].toLowerCase() === "dining dollars").reduce((a, b) => +(a + b["amount"]).toFixed(2), 0)
        })
      })
    } catch (e) {
      console.log(e);
    }
  }

  sortBy(e, method) {
    var primary_param = this.state.primary_param;
    var data = this.state.filtered_data;
    if (e.shiftKey) {
      console.log("ctrl click registered to method", method, "condition", method === this.state.primary_param);
      if (method === this.state.primary_param) {
        primary_param = "";
        this.setState({
          primary_param: ""
        })
      } else {
        primary_param = method;
        this.setState({
          primary_param: method
        })
      }
    }
    if (method === "amount") {
      var sorted = data.sort(function (a, b) {
        if (primary_param === "time") {
          var date_a = new Date(Date.parse(a["date"]));
          var date_b = new Date(Date.parse(b["date"]));
        }
        return primary_param === "date" ? Date.parse(b["date"]) - Date.parse(a["date"]) || b["amount"] - a["amount"] : primary_param === "time" ? ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) || b["amount"] - a["amount"] : primary_param === "account" ? a["account"].localeCompare(b["account"]) || b["amount"] - a["amount"] : primary_param === "location" ? a["location"].localeCompare(b["location"]) || b["amount"] - a["amount"] : primary_param === "type" ? a["type"].localeCompare(b["type"]) || b["amount"] - a["amount"] : b["amount"] - a["amount"];
      })
      this.setState({
        filtered_data: sorted,
        method: method
      })
    } else if (method === "date") {
      var sorted = data.sort(function (a, b) {
        if (primary_param === "time") {
          var date_a = new Date(Date.parse(a["date"]));
          var date_b = new Date(Date.parse(b["date"]));
        }
        return primary_param === "amount" ? b["amount"] - a["amount"] || Date.parse(b["date"]) - Date.parse(a["date"]) : primary_param === "time" ? ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) || Date.parse(b["date"]) - Date.parse(a["date"]) : primary_param === "account" ? a["account"].localeCompare(b["account"]) || Date.parse(b["date"]) - Date.parse(a["date"]) : primary_param === "location" ? a["location"].localeCompare(b["location"]) || Date.parse(b["date"]) - Date.parse(a["date"]) : primary_param === "type" ? a["type"].localeCompare(b["type"]) || Date.parse(b["date"]) - Date.parse(a["date"]) : Date.parse(b["date"]) - Date.parse(a["date"]);
      })
      this.setState({
        filtered_data: sorted,
        method: method
      })
    } else if (method === "time") {
      var sorted = data.sort(function (a, b) {
        var date_a = new Date(Date.parse(a["date"]));
        var date_b = new Date(Date.parse(b["date"]));
        return primary_param === "amount" ? b["amount"] - a["amount"] || ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) : primary_param === "date" ? Date.parse(b["date"]) - Date.parse(a["date"]) || ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) : primary_param === "account" ? a["account"].localeCompare(b["account"]) || ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) : primary_param === "location" ? a["location"].localeCompare(b["location"]) || ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) : primary_param === "type" ? a["type"].localeCompare(b["type"]) || ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) : ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24));

      });
      this.setState({
        filtered_data: sorted,
        method: method
      })
    } else if (method === "account") {
      var sorted = data.sort(function (a, b) {
        if (primary_param === "time") {
          var date_a = new Date(Date.parse(a["date"]));
          var date_b = new Date(Date.parse(b["date"]));
        }
        return primary_param === "amount" ? b["amount"] - a["amount"] || a["account"].localeCompare(b["account"]) : primary_param === "time" ? ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) || a["account"].localeCompare(b["account"]) : primary_param === "date" ? Date.parse(b["date"]) - Date.parse(a["date"]) || a["account"].localeCompare(b["account"]) : primary_param === "location" ? a["location"].localeCompare(b["location"]) || a["account"].localeCompare(b["account"]) : primary_param === "type" ? a["type"].localeCompare(b["type"]) || a["account"].localeCompare(b["account"]) : a["account"].localeCompare(b["account"]);
      })
      this.setState({
        filtered_data: sorted,
        method: method
      })
    } else if (method === "location") {
      var sorted = data.sort(function (a, b) {
        if (primary_param === "time") {
          var date_a = new Date(Date.parse(a["date"]));
          var date_b = new Date(Date.parse(b["date"]));
        }
        return primary_param === "amount" ? b["amount"] - a["amount"] || a["location"].localeCompare(b["location"]) : primary_param === "time" ? ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) || a["location"].localeCompare(b["location"]) : primary_param === "date" ? Date.parse(b["date"]) - Date.parse(a["date"]) || a["account"].localeCompare(b["account"]) : primary_param === "account" ? a["account"].localeCompare(b["account"]) || a["location"].localeCompare(b["location"]) : primary_param === "type" ? a["type"].localeCompare(b["type"]) || a["location"].localeCompare(b["location"]) : a["location"].localeCompare(b["location"]);
      })
      this.setState({
        filtered_data: sorted,
        method: method
      })
    }
    else if (method === "type") {
      var sorted = data.sort(function (a, b) {
        if (primary_param === "time") {
          var date_a = new Date(Date.parse(a["date"]));
          var date_b = new Date(Date.parse(b["date"]));
        }
        return primary_param === "amount" ? b["amount"] - a["amount"] || a["type"].localeCompare(b["type"]) : primary_param === "time" ? ((date_a - (date_a.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) - ((date_b - (date_b.getTimezoneOffset() * 60 * 1000)) % (1000 * 60 * 60 * 24)) || a["type"].localeCompare(b["type"]) : primary_param === "date" ? Date.parse(b["date"]) - Date.parse(a["date"]) || a["type"].localeCompare(b["type"]) : primary_param === "location" ? a["location"].localeCompare(b["location"]) || a["type"].localeCompare(b["type"]) : primary_param === "account" ? a["account"].localeCompare(b["account"]) || a["type"].localeCompare(b["type"]) : a["type"].localeCompare(b["type"]);
      })
      this.setState({
        filtered_data: sorted,
        method: method
      })
    }
    console.log("primary parameter", primary_param);
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
    // this.setState({
    //   filter: filter
    // })
  }

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
    var finalDay = new Date(2022, 6 - 1, 10 + 1, 0, 0, 0, 0); // ? school year end date (june 10, 2022)
    return Math.round(Math.abs(finalDay - currentDay) / (1000 * 60 * 60 * 24));
  }

  daysPast() {
    var currentDay = new Date();
    currentDay.setHours(0, 0, 0, 0);
    var startDay = new Date(2021, 9 - 1, 20, 0, 0, 0, 0);
    return Math.round(Math.abs(startDay - currentDay) / (1000 * 60 * 60 * 24));
  }

  spentDateDining(start_date, end_date) {
    if (!this.state.data.length) {
      return
    }
    var startCurrentDay = new Date(start_date);
    startCurrentDay.setHours(0, 0, 0, 0);
    var endCurrentDay = new Date(end_date);
    endCurrentDay.setHours(23, 59, 59, 999);
    return +(this.state.data.filter(e => e["type"].toLowerCase() === "debit" && e["account"].toLowerCase() === "dining dollars" && new Date(e["date"]).valueOf() > startCurrentDay.valueOf() && new Date(e["date"]).valueOf() < endCurrentDay.valueOf()).reduce((a, b) => a + b["amount"], 0)).toFixed(2);
  }

  render() {
    var data = this.state.filtered_data;
    return (
      <div id="main">
        <section>
          <h1 id="title">Budget Buddy Analyzer{this.state.debug ? " Debug Mode" : null} v{this.state.version}</h1>
          <p>Shift + Click on a header field to set it as the primary sort parameter. {this.state.outdated_version === -1 ? "Checking for latest version." : this.state.outdated_version === 1 ? `A newer version (v${this.state.newest_version}) is available!` : this.state.outdated_version === 2 ? "You are running the latest version!" : this.state.outdated_version === 3 ? "You are running a preview build!" : "Unable to check for updates."}</p>
          <div className="options">
            <select className="option" value={this.state.filter["location"]} onChange={this.onLocationFilterChange}>
              <option key="bb_default" value="" disabled>Select Location</option>
              <option key="bb_all_locations" value="bb_all_locations">All Locations</option>
              {this.state.locations.map(e =>
                <option key={e} value={e}>{e}</option>
              )}
            </select>
            <button className="option" onClick={this.applyFilter}>Filter</button>
          </div>
          <div className="table_container">
            <table>
              <thead>
                <tr className="table_header">
                  <th className={this.state.method === "location" && this.state.primary_param === "location" ? "selected primary" : this.state.primary_param === "location" ? "primary" : this.state.method === "location" ? "selected" : null} onClick={(e) => this.sortBy(e, "location")}>Location</th>
                  <th className={this.state.method === "amount" && this.state.primary_param === "amount" ? "selected primary" : this.state.primary_param === "amount" ? "primary" : this.state.method === "amount" ? "selected" : null} onClick={(e) => this.sortBy(e, "amount")}>Amount</th>
                  <th className={this.state.method === "account" && this.state.primary_param === "account" ? "selected primary" : this.state.primary_param === "account" ? "primary" : this.state.method === "account" ? "selected" : null} onClick={(e) => this.sortBy(e, "account")}>Account</th>
                  <th className={this.state.method === "date" && this.state.primary_param === "date" ? "selected primary" : this.state.primary_param === "date" ? "primary" : this.state.method === "date" ? "selected" : null} onClick={(e) => this.sortBy(e, "date")}>Date</th>
                  <th className={(this.state.method === "date" && this.state.primary_param === "date" ? "selected primary" : this.state.primary_param === "date" ? "primary" : this.state.method === "date" ? "selected" : null) || (this.state.method === "time" && this.state.primary_param === "time" ? "selected primary" : this.state.primary_param === "time" ? "primary" : this.state.method === "time" ? "selected" : null)} onClick={(e) => this.sortBy(e, "time")}>Time</th>
                  <th className={this.state.method === "type" && this.state.primary_param === "type" ? "selected primary" : this.state.primary_param === "type" ? "primary" : this.state.method === "type" ? "selected" : null} onClick={(e) => this.sortBy(e, "type")}>Type</th>
                </tr>
              </thead>
              <tbody>
                {this.state.filtered_data.map(e =>
                  <tr key={e.id}>
                    <td>{e.location}</td>
                    <td>${e.amount}</td>
                    <td>{e.account}</td>
                    <td>{new Date(Date.parse(e.date)).toLocaleDateString()}</td>
                    <td>{new Date(Date.parse(e.date)).toLocaleTimeString()}</td>
                    <td>{e.type}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
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
                  <td>${data.filter(e => e["type"].toLowerCase() === "credit" && e["account"] === "Dining Dollars").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"].toLowerCase() === "debit" && e["account"] === "Dining Dollars").reduce((a, b) => +(a + b["amount"]).toFixed(2), 0)}</td>
                  <td>${data.filter(e => e["type"].toLowerCase() === "credit" && e["account"] === "Triton Cash").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"].toLowerCase() === "debit" && e["account"] === "Triton Cash").reduce((a, b) => +(a + b["amount"]).toFixed(2), 0)}</td>
                  <td>${data.filter(e => e["type"].toLowerCase() === "credit" && e["account"] === "Triton2Go Dining Dollars").reduce((a, b) => a + b["amount"], 0) - data.filter(e => e["type"].toLowerCase() === "debit" && e["account"] === "Triton2Go Dining Dollars").reduce((a, b) => +(a + b["amount"]).toFixed(2), 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="footer">
            <div className='footer_container'>
              <p>Last Update: {this.state.last_update}</p>
              <a className='update_button' href="https://eacct-ucsd-sp.transactcampus.com/eAccounts/AccountTransaction.aspx"><button>Update Data</button></a>
            </div>
            <p>{this.state.filtered_data.length} {this.state.filtered_data.length !== 1 ? "Transactions" : "Transaction"}</p>
          </div>
        </section>
        <hr />
        <section>
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
                <span className="info_body">${this.spentDateDining(new Date(2021, 9 - 1), new Date())}</span>
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
                <span className="info_body">${+(this.spentDateDining(new Date(2021, 9 - 1), new Date()) / this.daysPast()).toFixed(2)}</span>
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
      </div>
    )
  }
}
