import React from "react";

export default class ToggleSwitch extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            checked: this.props.checked
        }
    }

    componentDidUpdate() {
        if (this.state.checked !== this.props.checked) {
            this.setState({
                checked: this.props.checked
            })
        }
    }

    render() {
        return (
            <label htmlFor={this.props.name} className="toggle-switch">
                <input type="checkbox" id={this.props.name} name={this.props.name} checked={this.state.checked} onChange={this.props.onChange} />
                <span className="slider"></span>
            </label>
        )
    }
}