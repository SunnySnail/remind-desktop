import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@material-ui/core';
import routes from '../constants/routes.json';
import styles from './Home.css';

export default function Home(): JSX.Element {
  return (
    <div className={styles.container} data-tid="container">
      <Button color="primary">Hello World</Button>
      <h2>Home1177555</h2>
      <Link to={routes.COUNTER}>to Counter</Link>
    </div>
  );
}
