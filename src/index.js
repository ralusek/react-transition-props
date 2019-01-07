import React from 'react';


/**
 *
 */
export default class TransitionManager extends React.Component {
  /**
   * 
   */
  constructor() {
    super();
    this.state = {instance: this};
    this.timeouts = {};
    this.mounted = true;
    this.initialized = false;
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
  static getDerivedStateFromProps(props, state) {
    if (!state.instance.initialized) return _initialize(props, state);
    
    Object.keys(props.transitions).forEach(transitionName => {
      const newValue = props.transitions[transitionName].value;
      const oldValue = state.transitions[transitionName].value;
      const transitioningTo = state.transitions[transitionName].transitioningTo;
      if ((newValue !== oldValue) && (newValue !== transitioningTo)) setTimeout(() => state.instance.handleTransition(transitionName, newValue), 0);
    });

    return state;
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
    const duration = transition.duration[value] || transition.duration;


    this.setTransitionValues(transitionName, {
      transitioningTo: value,
      transitioningFrom: transition.value,
      transitioningSince: Date.now()
    });


    if (duration) this.timeouts[transitionName] = setTimeout(() => {
      this.setTransitionValues(transitionName, {
        value,
        transitioningTo: null,
        transitioningFrom: null,
        transitioningSince: null
      });
    }, duration);
  }

  /**
   *
   */
  getTransitionValues() {
    return Object.keys(this.state.transitions).reduce((agg, transitionName) => {
      agg[transitionName] = {...this.state.transitions[transitionName]};
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


/**
 * 
 */
function _initialize(props, state) {
  state.instance.initialized = true;
  const transitions = state.transitions = {
  };

  const transitionConfigs = props.transitions || {};
  Object.keys(transitionConfigs).forEach(transitionName => {
    let { value, startingState, duration } = transitionConfigs[transitionName];

    duration = duration == null ? 333 : duration;

    transitions[transitionName] = {
      value: startingState != null ? startingState : value,
      transitioningTo: null,
      transitioningFrom: null,
      duration
    }

    if (startingState != null) state.instance.handleTransition(transitionName, props.transitions[transitionName].value);
  });

  return state;
}
