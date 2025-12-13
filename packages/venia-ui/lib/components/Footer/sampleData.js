import { ContactLink } from '../ContactPage';

const accountLinks = new Map()
    .set('Account', null)
    .set('Sign In', '/sign-in')
    .set('Register', '/create-account');

const aboutLinks = new Map()
    .set('About Us', null)
    .set('Our Story', '/about-us')
    .set('Email Signup', null)

const helpLinks = new Map()
    .set('Help', null)
    .set('Contact Us', {
        path: '/contact-us',
        Component: ContactLink
    })
    .set('Order Status', '/order-history');

export const DEFAULT_LINKS = new Map()
    .set('account', accountLinks)
    .set('about', aboutLinks)
    .set('help', helpLinks);

export const LOREM_IPSUM =
    'Lorem ipsum dolor sit amet, consectetur adipsicing elit, sed do eiusmod tempor incididunt ut labore et dolore.';
