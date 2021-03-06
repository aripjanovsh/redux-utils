import { Action, AnyAction } from "redux";

import { FulfillAction, PerformAction, RejectAction } from "../AsyncActions";
import {
  createAsyncValueDictReducer,
  createAsyncValueReducer,
  getAsyncValueError,
  getAsyncValuePayload,
  getInitialAsyncValue,
  isAsyncValueFetching,
} from "../AsyncValue";

describe("AsyncValue", () => {
  const perform = "perform";
  const fulfill = "fulfill";
  const reject = "reject";
  const reset = "reset";

  describe("getInitialAsyncValue", () => {
    test("initial value", () => {
      expect(getInitialAsyncValue()).toMatchSnapshot();
    });
  });

  describe("createAsyncValueReducer", () => {
    test("creation", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      expect(typeof reducer).toBe("function");
    });

    test("perform action", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      const error = new Error("Async Error");
      const action: PerformAction = { meta: {}, type: perform };

      expect(reducer({ fetching: false }, action)).toEqual({
        fetching: true,
      });

      expect(reducer({ payload: 10, fetching: false }, action)).toEqual({
        payload: 10,
        fetching: true,
      });

      expect(reducer({ error, fetching: false }, action)).toEqual({
        error,
        fetching: true,
      });

      expect(reducer({ error, payload: 10, fetching: false }, action)).toEqual({
        error,
        payload: 10,
        fetching: true,
      });
    });

    test("fulfill action", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      const error = new Error("Async Error");
      const action: FulfillAction<number> = {
        meta: {},
        payload: 30,
        type: fulfill,
      };

      expect(reducer({ fetching: true }, action)).toEqual({
        payload: 30,
        fetching: false,
      });

      expect(reducer({ payload: 10, fetching: true }, action)).toEqual({
        payload: 30,
        fetching: false,
      });

      expect(reducer({ error, fetching: true }, action)).toEqual({
        payload: 30,
        fetching: false,
      });

      expect(reducer({ error, payload: 10, fetching: true }, action)).toEqual({
        payload: 30,
        fetching: false,
      });
    });

    test("reject action", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      const stateError = new Error("AsyncError: State.");
      const actionError = new Error("AsyncError: Action.");
      const action: RejectAction = {
        meta: {},
        error: true,
        type: reject,
        payload: actionError,
      };

      expect(reducer({ fetching: true }, action)).toEqual({
        fetching: false,
        error: actionError,
      });

      expect(reducer({ payload: 10, fetching: true }, action)).toEqual({
        payload: 10,
        fetching: false,
        error: actionError,
      });

      expect(reducer({ fetching: true, error: stateError }, action)).toEqual({
        fetching: false,
        error: actionError,
      });

      expect(
        reducer({ payload: 10, fetching: true, error: stateError }, action),
      ).toEqual({
        payload: 10,
        fetching: false,
        error: actionError,
      });
    });

    test("reset action", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      const error = new Error("AsyncError: State.");
      const action: Action = { type: reset };

      expect(reducer({ fetching: true }, action)).toEqual({
        fetching: false,
      });

      expect(reducer({ payload: 10, fetching: true }, action)).toEqual({
        fetching: false,
      });

      expect(reducer({ error, fetching: true }, action)).toEqual({
        fetching: false,
      });

      expect(reducer({ error, payload: 10, fetching: true }, action)).toEqual({
        fetching: false,
      });
    });

    test("unknown action", () => {
      const reducer = createAsyncValueReducer<number>(
        perform,
        fulfill,
        reject,
        reset,
      );

      const error = new Error("AsyncError: State.");
      const action: Action = { type: "FOO" };

      expect(
        reducer(
          {
            fetching: true,
          },
          action,
        ),
      ).toEqual({ fetching: true });

      expect(reducer({ payload: 10, fetching: true }, action)).toEqual({
        payload: 10,
        fetching: true,
      });

      expect(reducer({ error, fetching: true }, action)).toEqual({
        error,
        fetching: true,
      });

      expect(reducer({ error, payload: 10, fetching: true }, action)).toEqual({
        error,
        payload: 10,
        fetching: true,
      });
    });
  });

  describe("createAsyncValueDictReducer", () => {
    interface ActionMeta {
      readonly id: number;
    }

    const hashResolver = (action: AnyAction) =>
      (action as PerformAction<ActionMeta>).meta.id;

    test("creation", () => {
      const reducer = createAsyncValueDictReducer<number>(
        hashResolver,
        perform,
        fulfill,
        reject,
        reset,
      );

      expect(typeof reducer).toBe("function");
    });

    test("unknown action", () => {
      const reducer = createAsyncValueDictReducer<number>(
        hashResolver,
        perform,
        fulfill,
        reject,
        reset,
      );

      const action: Action = { type: "FOO" };

      expect(reducer({}, action)).toEqual({});
    });

    test("flow", () => {
      const reducer = createAsyncValueDictReducer<number>(
        hashResolver,
        perform,
        fulfill,
        reject,
        reset,
      );

      let state = {};

      state = reducer(state, {
        type: perform,
        meta: { id: 1 },
      } as PerformAction<ActionMeta>);

      expect(state).toEqual({ 1: { fetching: true } });

      state = reducer(state, {
        payload: 10,
        type: fulfill,
        meta: { id: 1 },
      } as FulfillAction<number, ActionMeta>);

      expect(state).toEqual({ 1: { fetching: false, payload: 10 } });

      state = reducer(state, {
        payload: 20,
        type: perform,
        meta: { id: 2 },
      } as FulfillAction<number, ActionMeta>);

      expect(state).toEqual({
        1: { fetching: false, payload: 10 },
        2: { fetching: true },
      });

      const error = new Error("AsyncError");

      state = reducer(state, {
        payload: error,
        type: reject,
        meta: { id: 2 },
        error: true,
      } as RejectAction<ActionMeta>);

      expect(state).toEqual({
        1: { fetching: false, payload: 10 },
        2: { fetching: false, error },
      });

      state = reducer(state, {
        type: perform,
        meta: { id: 2 },
      } as PerformAction<ActionMeta>);

      expect(state).toEqual({
        1: { fetching: false, payload: 10 },
        2: { fetching: true, error },
      });

      state = reducer(state, {
        payload: 20,
        type: perform,
        meta: { id: 2 },
      } as FulfillAction<number, ActionMeta>);

      expect(state).toEqual({
        1: { fetching: false, payload: 10 },
        2: { fetching: true, error },
      });
    });
  });

  describe("isAsyncValueFetching", () => {
    test("basics", () => {
      expect(isAsyncValueFetching(undefined)).toBe(false);
      expect(isAsyncValueFetching({ fetching: true })).toBe(true);
      expect(isAsyncValueFetching({ fetching: false })).toBe(false);
    });
  });

  describe("getAsyncValueError", () => {
    test("basics", () => {
      const error = new Error("AsyncError");

      expect(getAsyncValueError(undefined)).toBe(undefined);
      expect(getAsyncValueError({ fetching: true })).toBe(undefined);
      expect(getAsyncValueError({ fetching: true, error })).toBe(error);
    });
  });

  describe("getAsyncValuePayload", () => {
    test("basics", () => {
      const payload = {};

      expect(getAsyncValuePayload(undefined)).toBe(undefined);
      expect(getAsyncValuePayload({ fetching: true })).toBe(undefined);
      expect(getAsyncValuePayload({ fetching: true, payload })).toBe(payload);
    });
  });
});
