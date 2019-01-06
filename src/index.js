import React from 'react';


/**
 *
 */
export default class TransitionManager extends React.Component {
  /**
   *
   */
  componentWillMount() {
    this.mountFromInverted = [];
    this.timeouts = {};
    this.mounted = true;

    const transitions = {
      mounted: {
        value: false,
        transitioningTo: true
      }
    };

    const transitionConfigs = this.props.transitions || {};
    Object.keys(transitionConfigs).forEach(transitionName => {
      let {value, mountFromInverted, duration} = transitionConfigs[transitionName];

      if (mountFromInverted) this.mountFromInverted.push(transitionName);

      duration = duration == null ? 333 : duration;
      if (!isNaN(Number(duration))) {
        duration = {
          true: duration,
          false: duration
        }
      }

      transitions[transitionName] = {
        value: mountFromInverted ? !value : value,
        transitioningTo: null,
        duration
      }
    });

    this.setState({transitions});
  }

  /**
   *
   */
  componentDidMount() {
    const {transitions} = this.state;

    this.mountFromInverted.forEach(transitionName => {
      const currentValue = transitions[transitionName].value;
      this.handleTransition(transitionName, !currentValue);
    });

    this.setTransitionValues('mounted', {value: true, transitioningTo: null});
  }

  /**
   *
   */
  componentWillUnmount() {
    this.mounted = false;
  }

  /**
   *
   */
  setTransitionValues(transitionName, values) {
    if (!this.mounted) return;

    this.setState((prevState) => ({
      transitions: {
        ...prevState.transitions,
        [transitionName]: {
          ...prevState.transitions[transitionName],
          ...values
        }
      }
    }));
  }

  /**
   *
   */
  handleTransition(transitionName, value) {
    const self = this;

    clearTimeout(this.timeouts[transitionName]);
    const transition = this.state.transitions[transitionName];
    const duration = transition.duration[value];
    

    this.setTransitionValues(transitionName, {
      transitioningTo: value,
      transitioningSince: Date.now()
    });


    if (duration) this.timeouts[transitionName] = setTimeout(() => {
      this.setTransitionValues(transitionName, {value, transitioningTo: null, transitioningSince: null});
    }, duration);
  }

  /**
   *
   */
  getTransitionValues() {
    return Object.keys(this.state.transitions).reduce((agg, transitionName) => {
      const { value, transitioningTo, transitioningSince } = this.state.transitions[transitionName];
      agg[transitionName] = {value, transitioningTo, transitioningSince};
      return agg;
    }, {});
  }

  /**
   *
   */
  render() {
    const { children, transitions = {}, render, ...props } = this.props;

    const transitionProps = {
      ...props,
      transitionValues: this.getTransitionValues()
    };

    if (render) return render(transitionProps);

    const childrenWithProps = React.Children.map(this.props.children, child => {
      return React.isValidElement(child) ? React.cloneElement(child, transitionProps) : child;
    });

    return <React.Fragment>
    {
      childrenWithProps
    }
    </React.Fragment>
  }
}
