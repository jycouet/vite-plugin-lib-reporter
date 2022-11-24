#!/usr/bin/env node
import { spawn } from 'node:child_process'

spawn('npx', ['http-server', './node_modules/vite-plugin-lib-reporter/ui', '-s', '-p 5177'], {
  stdio: 'inherit',
})
console.log('server lib-reporter started on http://127.0.0.1:5177')
