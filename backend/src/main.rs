use axum::{
    extract::ws::{WebSocket, WebSocketUpgrade, Message},
    extract::State,
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;
use tokio::io::{AsyncWriteExt, BufWriter};
use tokio::fs::File;

#[tokio::main]
async fn main() {
    println!("Hello, world!");
}
