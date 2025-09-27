import React, { useEffect, useRef, useState } from 'react';

import { useIsInViewport } from '@magento/peregrine/lib/hooks/useIsInViewport';
import { useMegaMenu } from '@magento/peregrine/lib/talons/MegaMenu/useMegaMenu';
import { useStyle } from '@magento/venia-ui/lib/classify';

import MegaMenuItem from './megaMenuItem';
import defaultClasses from './megaMenu.module.css';

/**
 * The MegaMenu component displays menu with categories on desktop devices
 */
const MegaMenu = props => {
    const mainNavRef = useRef(null);

    const {
        megaMenuData,
        activeCategoryId,
        subMenuState,
        disableFocus,
        handleSubMenuFocus,
        categoryUrlSuffix,
        handleNavigate,
        handleClickOutside
    } = useMegaMenu({ mainNavRef });

    const classes = useStyle(defaultClasses, props.classes);

    const [mainNavWidth, setMainNavWidth] = useState(0);
    const shouldRenderItems = useIsInViewport({
        elementRef: mainNavRef
    });

    useEffect(() => {
        const handleResize = () => {
            const navWidth = mainNavRef.current
                ? mainNavRef.current.offsetWidth
                : null;

            setMainNavWidth(navWidth);
        };

        window.addEventListener('resize', handleResize);

        handleResize();

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });
    
    const MAX_CATEGORIES = 8;
    const allCategories = megaMenuData.children || [];

    const visibleCategories = allCategories.slice(0, MAX_CATEGORIES);
    const extraCategories = allCategories.slice(MAX_CATEGORIES);

    const isMoreMenu = false;

    const items = visibleCategories.map(category => (
        <MegaMenuItem
            key={category.uid}
            category={category}
            activeCategoryId={activeCategoryId}
            categoryUrlSuffix={categoryUrlSuffix}
            mainNavWidth={mainNavWidth}
            onNavigate={handleNavigate}
            subMenuState={subMenuState}
            disableFocus={disableFocus}
            handleSubMenuFocus={handleSubMenuFocus}
            handleClickOutside={handleClickOutside}
        />
    ));

    if (extraCategories.length) {
        items.push(
            <MegaMenuItem
                key="more-menu"
                category={{
                    name: 'More',
                    children: extraCategories,
                    url_path: '#'
                }}
                isMoreMenu={true} // You can use this to style it differently
                activeCategoryId={activeCategoryId}
                categoryUrlSuffix={categoryUrlSuffix}
                mainNavWidth={mainNavWidth}
                onNavigate={handleNavigate}
                subMenuState={subMenuState}
                disableFocus={disableFocus}
                handleSubMenuFocus={handleSubMenuFocus}
                handleClickOutside={handleClickOutside}
            />
        );
    }
    
    if (isMoreMenu) {
        return (
            <div className={classes.moreMenu}>
                <span>More</span>
                <ul className={classes.moreMenuList}>
                    {category.children.map(child => (
                        <li key={child.uid}>
                            <Link to={`/${child.url_path}${categoryUrlSuffix || ''}`}>
                                {child.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
    



    // const items = megaMenuData.children
    //     ? megaMenuData.children
    //         .slice(0,MAX_CATEGORIES)
    //         .map(category => {
    //           return (
    //               <MegaMenuItem
    //                   category={category}
    //                   activeCategoryId={activeCategoryId}
    //                   categoryUrlSuffix={categoryUrlSuffix}
    //                   mainNavWidth={mainNavWidth}
    //                   onNavigate={handleNavigate}
    //                   key={category.uid}
    //                   subMenuState={subMenuState}
    //                   disableFocus={disableFocus}
    //                   handleSubMenuFocus={handleSubMenuFocus}
    //                   handleClickOutside={handleClickOutside}
    //               />
    //           );
    //       })
    //     : null;

    return (
        <nav
            ref={mainNavRef}
            className={classes.megaMenu}
            data-cy="MegaMenu-megaMenu"
            role="navigation"
            onFocus={handleSubMenuFocus}
        >
            {shouldRenderItems ? items : null}
        </nav>
    );
};

export default MegaMenu;
