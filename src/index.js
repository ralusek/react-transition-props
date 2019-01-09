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
    if (!state.initialized) state = _initialize(props, state);

    Object.keys(props.transitions).forEach(transitionName => {
      const newValue = props.transitions[transitionName].value;
      const oldValue = state.transitions[transitionName].value;
      const transitioningTo = state.transitions[transitionName].transitioningTo;

      state = _updateTransitionConfigs(state, transitionName, props.transitions[transitionName] || {});
      
      if (newValue === transitioningTo) return;

      if (oldValue === newValue && (transitioningTo == null)) return;

      state = _beginTransition(state, transitionName, newValue);
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
            transitioningSince: null,
            duration: null
          });
        });
      }, transition.duration);
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
    transitionConfigs: {},
    initialized: true
  };

  const transitions = state.transitions;

  const transitionConfigs = props.transitions || {};
  Object.keys(transitionConfigs).forEach(transitionName => {
    let { value, startingState, duration } = transitionConfigs[transitionName];

    transitions[transitionName] = {
      value: startingState != null ? startingState : value,
      transitioningTo: null,
      transitioningFrom: null
    }

    if (startingState != null) state = _beginTransition(state, transitionName, props.transitions[transitionName].value);
  });

  return state;
}

/**
 *
 */
function _updateTransitionConfigs(state, transitionName, config) {
  return {
    ...state,
    transitionConfigs: {
      ...state.transitionConfigs,
      [transitionName]: {
        duration: config.duration == null ? 333 : config.duration,
        rollbackTimeOnReversion: config.rollbackTimeOnReversion !== false
      }
    }
  }
}


/**
 *
 */
function _beginTransition(state, transitionName, value) {
  const transitionConfig = state.transitionConfigs[transitionName];
  const existingTransition = state.transitions[transitionName];

  const { transitioningSince } = existingTransition;

  const newTransition = {
    transitioningTo: value,
    transitioningFrom: transitioningSince && existingTransition.value,
    transitioningSince: Date.now(),
    duration: transitionConfig.duration,
    // can be used to add starting states for css transitions, is immediately removed
    // after state update completes
    isNew: true,
    value: transitioningSince ? undefined : existingTransition.value
  };

  // If transition is in progress and we are reverting to a previous value,
  // rollback the duration for the time the existing transition has been in
  // progress.
  if (
    transitioningSince &&
    (value === existingTransition.value) &&
    transitionConfig.rollbackTimeOnReversion
  ) {
    newTransition.duration = Date.now() - existingTransition.transitioningSince;
  }

  return _setTransitionValues(state, transitionName, newTransition);
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
