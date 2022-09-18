import React from "react";
import sort from "../utilities/sort";

export default class Table extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            raw_data: this.props.data, // Unsorted data
            data: this.props.data, // Sorted data
            sort: {
                primary_field: null,
                secondary_field: null,
                reverse: false,
                default_field: "date"
            }
        };
        this.sortBy = this.sortBy.bind(this);
    }

    componentDidUpdate(prevProps, prevState, snapshot) { // Update state when props change
        if (prevProps.data !== this.props.data) {
            this.setState({
                data: this.props.data,
                raw_data: this.props.data
            })
        }
    }

    /**
     * Method to sort this.state.data by the given field.
     * 
     * TODO: Add secondary sorting
     * @param {*} e 
     * @param {*} primary_field 
     */
    sortBy(e, primary_field) {
        console.log("sorting by " + primary_field);
        if (e) e.preventDefault();
        if (!primary_field) return;

        let raw_data = this.state.raw_data;
        let sorted_data = this.state.sort.primary_field === primary_field ? raw_data.reverse() : sort(raw_data, primary_field, this.state.sort.secondary_field);
        this.setState({
            data: sorted_data,
            sort: {
                primary_field: primary_field,
                // secondary_field: secondary_field,
                reverse: this.state.sort.primary_field === primary_field ? !this.state.sort.reverse : false
            }
        })
    }

    getTableHeaderClass(...field) {
        if (field.includes(this.state.sort.primary_field)) return "selected primary";
        // else if (this.state.primary_field === field) return "primary";
        // else if (this.state.method === field) return "selected";
        else return null;
    }

    render() {
        return (
            <div className="table_container">
                <table>
                    <thead>
                        <tr className="table_header">
                            <th className={this.getTableHeaderClass("location")} onClick={(e) => this.sortBy(e, "location")}>Location</th>
                            <th className={this.getTableHeaderClass("amount")} onClick={(e) => this.sortBy(e, "amount")}>Amount</th>
                            <th className={this.getTableHeaderClass("account")} onClick={(e) => this.sortBy(e, "account")}>Account</th>
                            <th className={this.getTableHeaderClass("date")} onClick={(e) => this.sortBy(e, "date")}>Date</th>
                            <th className={this.getTableHeaderClass("time", "date")} onClick={(e) => this.sortBy(e, "time")}>Time</th>
                            <th className={this.getTableHeaderClass("type")} onClick={(e) => this.sortBy(e, "type")}>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        {this.state.data.map(e =>
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
        )
    };
}