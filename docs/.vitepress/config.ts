import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'OpenFeed',
  description: 'A self-hosted news and social media aggregator',
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'GitHub', link: 'https://github.com/sampl/openfeed' },
    ],
    sidebar: [
      { text: 'Overview', link: '/' },
      { text: 'Installation', link: '/installation' },
      { text: 'Configuration', link: '/configuration' },
      {
        text: 'Plugins',
        items: [
          { text: 'Overview', link: '/plugins/' },
          { text: 'Supported plugins', link: '/plugins/supported' },
          { text: 'Writing a plugin', link: '/plugins/custom' },
          { text: 'Error handling', link: '/plugins/errors' },
        ],
      },
      { text: 'API', link: '/api' },
      { text: 'For agents', link: '/agents' },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sampl/openfeed' },
    ],
  },
})
