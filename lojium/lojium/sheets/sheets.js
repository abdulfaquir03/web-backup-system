const { google } = require('googleapis')
require('dotenv').config()

const auth = new google.auth.GoogleAuth({
  keyFile: './lojium/sheets/auth/credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
})

const sheets = google.sheets({ version: 'v4', auth })
const spreadsheetId = process.env.PLANILHA_ID
const aba = 'lojium'

const parseVal = v => (Array.isArray(v) ? v : [v]).map(x => (typeof x === 'object' && x !== null ? JSON.stringify(x) : x));

const db = {
  get: async (range) => ({
    status: true,
    data: (await sheets.spreadsheets.values.get({
      spreadsheetId, 
      range: range ? `${aba}!${range}` : aba 
    })).data.values || [] 
  }),

  post: async (valores) => ({
    status: true,
    data: await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: aba,
      valueInputOption: 'USER_ENTERED',
      resource: { 
        values: [parseVal(valores)] 
      } 
    }) 
  }),

  update: async (range, valores) => ({
    status: true,
    data: await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${aba}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [parseVal(valores)] 
      } 
    }) 
  }),

  destroy: async (range) => ({
    status: true,
    data: await sheets.spreadsheets.values.clear({
      spreadsheetId, 
      range: `${aba}!${range}` 
    })
  })
}

module.exports = { db, sheets }