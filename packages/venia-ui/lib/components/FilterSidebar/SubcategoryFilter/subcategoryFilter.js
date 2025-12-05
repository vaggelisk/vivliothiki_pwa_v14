import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client';
import { GET_SUBCATEGORIES } from '@magento/peregrine/lib/talons/FilterSidebar/queries/getSubcategories.gql';
import classes from './subcategoryFilter.css';

const SubcategoryFilter = ({ categoryId }) => {
    
    // Decode base64 UID to get numeric ID
    let numericCategoryId = null;
    if (categoryId) {
        try {
            // Check if it's a base64 string (UID format)
            if (categoryId.includes('=') || /^[A-Za-z0-9+/]+={0,2}$/.test(categoryId)) {
                numericCategoryId = parseInt(atob(categoryId), 10);
            } else {
                // Otherwise try to parse directly
                numericCategoryId = parseInt(categoryId, 10);
            }
        } catch (e) {
            console.error('Failed to decode categoryId:', e);
        }
    }
    
    const shouldSkip = !numericCategoryId || isNaN(numericCategoryId);

    
    const { data, loading, error } = useQuery(GET_SUBCATEGORIES, {
        variables: { id: numericCategoryId },
        skip: shouldSkip
    });


    if (shouldSkip) return null;
    if (loading) return null;
    if (error) {
        return null;
    }
    if (!data?.category?.children?.length) return null;

    return (
        <div className={classes.root}>
            <span className={classes.title}>Subcategories</span>

            <ul className={classes.list}>
                {data.category.children.map(child => (
                    <li key={child.id} className={classes.item}>
                        <Link to={`/${child.url_path}`} className={classes.link}>
                            {child.name}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SubcategoryFilter;
