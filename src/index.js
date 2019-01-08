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

    this.state = {};
    this.timeouts = {};
    this.mounted = true;
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
    if (!state.initialized) return _initialize(props, state);

    Object.keys(props.transitions).forEach(transitionName => {
      const newValue = props.transitions[transitionName].value;
      const oldValue = state.transitions[transitionName].value;
      const transitioningTo = state.transitions[transitionName].transitioningTo;
      if ((newValue !== oldValue) && (newValue !== transitioningTo)) state = _beginTransition(state, transitionName, newValue);
    });

    return state;
  }

  /**
   *
   */
  componentDidUpdate() {
    if (!this.state.hasUpdated) this.setState(prevState => ({ ...prevState, hasUpdated: true }));
    const { transitions } = this.state;

    let newState = this.state;

    Object.keys(transitions).forEach(transitionName => {
      const transition = transitions[transitionName];
      if (!transition.isNew) return; // Not new transition, ignore.

      newState = _setTransitionValues(newState, transitionName, {isNew: false});

      const previous = this.timeouts[transitionName];

      clearTimeout(previous);

      const duration = transition.duration[transition.value] || transition.duration;
      const current = this.timeouts[transitionName] = setTimeout(() => {
        // Redundant check against race conditions to ensure that the same
        // transition is still active.
        if (current !== this.timeouts[transitionName]) return;
        this.timeouts[transitionName] = null;

        this.setState((prevState) => {
          return _setTransitionValues(prevState, transitionName, {
            value: transition.transitioningTo,
            transitioningTo: null,
            transitioningFrom: null,
            transitioningSince: null
          });
        });
      }, duration);
    });

    if (newState !== this.state) this.setState(() => newState);
  }

  /**
   *
   */
  getTransitionValues() {
    return Object.keys(this.state.transitions).reduce((agg, transitionName) => {
      agg[transitionName] = { ...this.state.transitions[transitionName] };
      return agg;
    }, {});
  }

  /**
   *
   */
  render() {
    // This is stupid, but componentDidUpdate is not called after initial update.
    if (!this.state.hasUpdated) setTimeout(() => this.mounted && this.forceUpdate());

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
  state = {
    ...state,
    transitions: {},
    initialized: true
  };

  const transitions = state.transitions;

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

    if (startingState != null) state = _beginTransition(state, transitionName, props.transitions[transitionName].value);
  });

  return state;
}


/**
 *
 */
function _beginTransition(state, transitionName, value) {
  const transition = state.transitions[transitionName];

  if (value === transition.value) return state; // No change in destination, ignore.

  return _setTransitionValues(state, transitionName, {
    transitioningTo: value,
    transitioningFrom: transition.value,
    transitioningSince: Date.now(),
    // can be used to add starting states for css transitions, is immediately removed
    // after state update completes
    isNew: true 
  });
}


/**
 *
 */
function _setTransitionValues(state, transitionName, values) {
  return {
    ...state,
    transitions: {
      ...state.transitions,
      [transitionName]: {
        ...state.transitions[transitionName],
        ...values
      }
    }
  };
}
