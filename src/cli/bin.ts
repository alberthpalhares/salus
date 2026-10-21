#!/usr/bin/env node
import { nodeIo } from './io.js';
import { main } from './main.js';

// Sem process.exit: o processo termina sozinho e o stdout em pipe é drenado por completo.
process.exitCode = await main(process.argv.slice(2), nodeIo());
