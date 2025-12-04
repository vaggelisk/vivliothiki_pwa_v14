import { gql } from '@apollo/client';

export const GET_SUBCATEGORIES = gql`
    query GetSubcategories($id: Int!) {
        category(id: $id) {
            id
            name
            uid
            children {
                id
                name
                uid
                url_key
                url_path
            }
        }
    }
`;
