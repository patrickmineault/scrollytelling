const React = require('react');
const { Runtime, Inspector, Library } = require("@observablehq/runtime");
// The original observable notebook is located here:
// https://observablehq.com/@patrickmineault/balanced-e-i-networks
import notebook from "./notebooks/lif.js";

class Observable extends React.Component {

  componentDidMount() {
    
    const runtime = new Runtime(
      Object.assign(new Library(), this.props.variables)
    );
    const module = runtime.module(notebook, (name) => {
      if (name && this.props.showCells.indexOf(name) > -1) {
        const el = document.createElement('div');
        this._ref.appendChild(el);
        return new Inspector(el);
      }
    });
    for(const [key, value] of Object.entries(this.props.variables)) {
      if(key == 'width') {
        continue;
      }
      console.log(key);
      console.log(value);
      module.redefine(key, value);
    }
    this._module = module;
  }

  componentDidUpdate() {
    if(this._module == null) {
      return
    }
    for(const [key, value] of Object.entries(this.props.variables)) {
      if(key == 'width') {
        continue;
      }
      this._module.redefine(key, value);
    }
  }

  render() {
    const { idyll, hasError, updateProps, ...props } = this.props;
    return (
      <div ref={(ref) => this._ref = ref} className={this.props.className}/>
    );
  }
}

module.exports = Observable;
