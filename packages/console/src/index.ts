#!/usr/bin/env bun

import React from "react";
import { render } from "ink";
import { App } from "./App.js";
import { createTuiClient } from "./client.js";

const client = createTuiClient();

render(React.createElement(App, { client }));
