output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the provisioned VPC."
}

output "vpc_cidr_block" {
  value       = aws_vpc.main.cidr_block
  description = "The CIDR block allocated to the VPC."
}

output "public_subnet_ids" {
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
  description = "List of public subnet IDs across multiple AZs."
}

output "private_subnet_ids" {
  value       = [aws_subnet.private_1.id, aws_subnet.private_2.id]
  description = "List of private subnet IDs across multiple AZs."
}

output "nat_gateway_id" {
  value       = aws_nat_gateway.nat.id
  description = "The ID of the NAT Gateway provisioned in the public subnet."
}

output "igw_id" {
  value       = aws_internet_gateway.igw.id
  description = "The ID of the Internet Gateway attached to the VPC."
}
