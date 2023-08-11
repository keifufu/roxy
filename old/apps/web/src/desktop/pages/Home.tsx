import { For, type Component } from 'solid-js'
import apiClient from '../../apiClient'
import Store from '../../shared/state/store'

const copyScreenshotHost = () => {
  const json = JSON.stringify({
    Version: '14.1.4',
    Name: 'Roxy Images & Files', // TODO: read from env
    DestinationType: 'ImageUploader, FileUploader',
    RequestMethod: 'POST',
    RequestURL: 'https://dev.keifufu.dev/upload', // TODO: read from env
    Headers: {
      authorization: `ApiKey ${Store.user.getUser().apiKey}`
    },
    Body: 'MultipartFormData',
    FileFormName: 'file',
    URL: '{json:url}'
  })

  navigator.clipboard.writeText(json)
}

const copyTextHost = () => {
  const json = JSON.stringify({
    Version: '14.1.4',
    Name: 'Roxy Text', // TODO: read from env
    DestinationType: 'TextUploader',
    RequestMethod: 'POST',
    RequestURL: 'https://dev.keifufu.dev/api/paste/create', // TODO: read from env
    Headers: {
      authorization: `ApiKey ${Store.user.getUser().apiKey}`
    },
    Body: 'JSON',
    Data: '{\n  "title": "ShareX Text Upload",\n  "content": "{input}"\n}',
    URL: '{json:url}'
  })

  navigator.clipboard.writeText(json)
}

const copyUrlShortenerHost = () => {
  const json = JSON.stringify({
    Version: '14.1.4',
    Name: 'Roxy Url Shortener', // TODO: read from env
    DestinationType: 'URLShortener',
    RequestMethod: 'POST',
    RequestURL: 'https://dev.keifufu.dev/api/url-shortener/create', // TODO: read from env
    Headers: {
      authorization: `ApiKey ${Store.user.getUser().apiKey}`
    },
    Body: 'JSON',
    Data: '{\n  "destinationUrl": "{input}"\n}',
    URL: '{json:url}'
  })

  navigator.clipboard.writeText(json)
}

const Home: Component = () => (
  <div>
      Hello, {Store.user.getUser().username}
    <button onClick={copyScreenshotHost}>Copy Image and File Host</button>
    <button onClick={copyTextHost}>Copy Text Host</button>
    <button onClick={copyUrlShortenerHost}>Copy URL Shortener Host</button>
    {Store.user.getUser().apiKey}
    <button onClick={() => Store.user.logout()}>Logout</button>
  </div>
)

export default Home