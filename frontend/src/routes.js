import pageCases from './views/cases'
import pageCase from './views/case'
import pageReplay from './views/replay'
import pageBattles from './views/battles'
import pageBattle from './views/battle'

import pageUser from './views/user'
import UserStats from './views/user/stats'
import UserHistory from './views/user/history'
import UserInventory from './views/user/inventory'
import UserAffiliates from './views/user/affiliates'

export default [
  {
    name: 'Cases',
    path: '/',
    component: pageCases
  },
  {
    name: 'Case',
    path: '/case/:id',
    component: pageCase
  },
  {
    name: 'Replay',
    path: '/replay/:id',
    component: pageReplay
  },
  {
    name: 'Case Battles',
    path: '/battles',
    component: pageBattles
  },
  {
    name: 'Battle',
    path: '/battle/:id',
    component: pageBattle
  },
  {
    name: 'User',
    path: '/user/:id',
    component: pageUser,
    children: [
      { path: '', redirect: 'stats' },
      { path: 'stats', component: UserStats },
      { path: 'history', component: UserHistory },
      { path: 'inventory', component: UserInventory },
      { path: 'affiliates', component: UserAffiliates }
    ]
  },
  {
    path: '*',
    redirect: '/'
  }
]
